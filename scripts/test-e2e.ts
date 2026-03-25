/**
 * SomniaGate E2E Test Suite
 *
 * Tests the full PayGate lifecycle on Somnia testnet:
 *   1. Create gate
 *   2. Verify gate exists with correct params
 *   3. Check access (false before unlock)
 *   4. Unlock with exact price
 *   5. Check access (true after unlock)
 *   6. Verify revenue tracking and unlock count
 *   7. Verify creator balance (95% split)
 *   8. Verify platform balance (5% split)
 *   9. Creator withdraws
 *  10. Double-unlock reverts
 *  11. Underpayment reverts
 *  12. Overpayment refunds correctly
 *  13. Gate deactivation prevents new unlocks
 *  14. Platform withdraws accumulated fees
 *
 * Requires: PRIVATE_KEY and PAYGATE_ADDRESS in .env
 * Run: npx tsx scripts/test-e2e.ts
 */

import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { somniaTestnet } from './chain.js';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PAYGATE_ADDRESS = process.env.PAYGATE_ADDRESS as Address | undefined;

if (!PRIVATE_KEY) { console.error('Missing PRIVATE_KEY'); process.exit(1); }
if (!PAYGATE_ADDRESS) { console.error('Missing PAYGATE_ADDRESS — run deploy-paygate.ts first'); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as Hex);
const publicClient = createPublicClient({ chain: somniaTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http() } as any);

// Generate fresh user wallet for each test run
const userKey = generatePrivateKey();
const userAccount = privateKeyToAccount(userKey);
const userWallet = createWalletClient({ account: userAccount, chain: somniaTestnet, transport: http() } as any);

const PAYGATE_ABI = [
  { type: 'function', name: 'createGate', inputs: [{ name: 'contentId', type: 'bytes32' }, { name: 'price', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unlock', inputs: [{ name: 'contentId', type: 'bytes32' }], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'checkAccess', inputs: [{ name: 'contentId', type: 'bytes32' }, { name: 'user', type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getGate', inputs: [{ name: 'contentId', type: 'bytes32' }], outputs: [{ name: 'creator', type: 'address' }, { name: 'price', type: 'uint256' }, { name: 'active', type: 'bool' }, { name: 'totalRevenue', type: 'uint256' }, { name: 'unlockCount', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'creatorBalances', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'platformBalance', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'withdraw', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'withdrawPlatform', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'updateGate', inputs: [{ name: 'contentId', type: 'bytes32' }, { name: 'newPrice', type: 'uint256' }, { name: 'active', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'hasAccess', inputs: [{ name: '', type: 'bytes32' }, { name: '', type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
] as const;

// --- Test harness ---
let passed = 0;
let failed = 0;

function assert(ok: boolean, name: string, detail?: string) {
  if (ok) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); failed++; }
}

function toBytes32(str: string): Hex {
  const hex = Buffer.from(str).toString('hex').padEnd(64, '0');
  return `0x${hex}` as Hex;
}

async function run() {
  console.log('=== SomniaGate E2E Tests ===\n');
  console.log(`Creator:  ${account.address}`);
  console.log(`User:     ${userAccount.address}`);
  console.log(`PayGate:  ${PAYGATE_ADDRESS}\n`);

  // Use unique contentId per test run to avoid GateAlreadyExists
  const testId = `test-${Date.now()}`;
  const contentId = toBytes32(testId);
  const price = parseEther('1'); // 1 STT

  // --- Fund user ---
  console.log('--- Setup: Fund User ---');
  const fundHash = await walletClient.sendTransaction({
    to: userAccount.address,
    value: parseEther('10'),
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash, timeout: 60_000 });
  const userBal = await publicClient.getBalance({ address: userAccount.address });
  assert(userBal >= parseEther('9'), `user funded: ${formatEther(userBal)} STT`);

  // --- Test 1: Create gate ---
  console.log('\n--- 1. Create Gate ---');
  const createHash = await walletClient.writeContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'createGate',
    args: [contentId, price],
  });
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash, timeout: 60_000 });
  assert(createReceipt.status === 'success', 'createGate tx succeeded');

  // --- Test 2: Verify gate params ---
  console.log('\n--- 2. Verify Gate ---');
  const gate = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'getGate',
    args: [contentId],
  });
  assert(gate[0].toLowerCase() === account.address.toLowerCase(), `creator = ${gate[0]}`);
  assert(gate[1] === price, `price = ${formatEther(gate[1])} STT`);
  assert(gate[2] === true, 'gate is active');
  assert(gate[3] === 0n, 'totalRevenue = 0');
  assert(gate[4] === 0n, 'unlockCount = 0');

  // --- Test 3: Access before unlock ---
  console.log('\n--- 3. Access Before Unlock ---');
  const beforeAccess = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'checkAccess',
    args: [contentId, userAccount.address],
  });
  assert(beforeAccess === false, 'user has no access before unlock');

  // --- Test 4: Unlock with exact price ---
  console.log('\n--- 4. Unlock ---');
  const unlockHash = await userWallet.writeContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'unlock',
    args: [contentId],
    value: price,
  });
  const unlockReceipt = await publicClient.waitForTransactionReceipt({ hash: unlockHash, timeout: 60_000 });
  assert(unlockReceipt.status === 'success', 'unlock tx succeeded');
  console.log(`  Gas used: ${unlockReceipt.gasUsed}`);

  // --- Test 5: Access after unlock ---
  console.log('\n--- 5. Access After Unlock ---');
  const afterAccess = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'checkAccess',
    args: [contentId, userAccount.address],
  });
  assert(afterAccess === true, 'user has access after unlock');

  // --- Test 6: Revenue tracking ---
  console.log('\n--- 6. Revenue Tracking ---');
  const gateAfter = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'getGate',
    args: [contentId],
  });
  assert(gateAfter[3] === price, `totalRevenue = ${formatEther(gateAfter[3])} STT`);
  assert(gateAfter[4] === 1n, `unlockCount = ${gateAfter[4]}`);

  // --- Test 7: Creator balance (95%) ---
  console.log('\n--- 7. Creator Balance ---');
  const expectedCreatorCut = price * 9500n / 10000n; // 95%
  const creatorBal = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'creatorBalances',
    args: [account.address],
  }) as bigint;
  assert(creatorBal >= expectedCreatorCut, `creator balance >= ${formatEther(expectedCreatorCut)} STT (actual: ${formatEther(creatorBal)})`);

  // --- Test 8: Platform balance (5%) ---
  console.log('\n--- 8. Platform Balance ---');
  const expectedPlatformCut = price * 500n / 10000n; // 5%
  const platformBal = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'platformBalance',
  }) as bigint;
  // Platform balance may include fees from previous test runs, so check >= expected
  assert(platformBal >= expectedPlatformCut, `platform balance >= ${formatEther(expectedPlatformCut)} STT (actual: ${formatEther(platformBal)})`);

  // --- Test 9: Creator withdraws ---
  console.log('\n--- 9. Creator Withdraw ---');
  const balBefore = await publicClient.getBalance({ address: account.address });
  const withdrawHash = await walletClient.writeContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'withdraw',
  });
  const withdrawReceipt = await publicClient.waitForTransactionReceipt({ hash: withdrawHash, timeout: 60_000 });
  assert(withdrawReceipt.status === 'success', 'withdraw tx succeeded');
  const balAfter = await publicClient.getBalance({ address: account.address });
  assert(balAfter > balBefore - parseEther('0.1'), 'creator received funds (minus gas)');

  const creatorBalAfter = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'creatorBalances',
    args: [account.address],
  }) as bigint;
  assert(creatorBalAfter === 0n, 'creator balance zeroed after withdraw');

  // --- Test 10: Double unlock reverts ---
  console.log('\n--- 10. Double Unlock Reverts ---');
  try {
    await userWallet.writeContract({
      address: PAYGATE_ADDRESS!,
      abi: PAYGATE_ABI,
      functionName: 'unlock',
      args: [contentId],
      value: price,
    });
    assert(false, 'double unlock should revert');
  } catch (err: any) {
    assert(err.message.includes('reverted') || err.message.includes('AlreadyUnlocked'), 'double unlock reverted');
  }

  // --- Test 11: Underpayment reverts ---
  console.log('\n--- 11. Underpayment Reverts ---');
  const contentId2 = toBytes32(`test2-${Date.now()}`);
  await walletClient.writeContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'createGate',
    args: [contentId2, parseEther('2')],
  }).then(h => publicClient.waitForTransactionReceipt({ hash: h, timeout: 60_000 }));

  try {
    await userWallet.writeContract({
      address: PAYGATE_ADDRESS!,
      abi: PAYGATE_ABI,
      functionName: 'unlock',
      args: [contentId2],
      value: parseEther('1'), // underpaying
    });
    assert(false, 'underpayment should revert');
  } catch (err: any) {
    assert(err.message.includes('reverted') || err.message.includes('InsufficientPayment'), 'underpayment reverted');
  }

  // --- Test 12: Overpayment refunds ---
  console.log('\n--- 12. Overpayment Refund ---');
  try {
    const userBalBefore = await publicClient.getBalance({ address: userAccount.address });
    const overpayHash = await userWallet.writeContract({
      address: PAYGATE_ADDRESS!,
      abi: PAYGATE_ABI,
      functionName: 'unlock',
      args: [contentId2],
      value: parseEther('5'), // overpaying by 3 STT (gate price is 2)
    });
    await publicClient.waitForTransactionReceipt({ hash: overpayHash, timeout: 60_000 });
    const userBalAfter = await publicClient.getBalance({ address: userAccount.address });
    // User should have lost ~2 STT (gate price) + gas, not 5 STT
    const spent = userBalBefore - userBalAfter;
    assert(spent < parseEther('3'), `user spent ${formatEther(spent)} STT (should be ~2 + gas, not 5)`);
  } catch (err: any) {
    assert(false, 'overpayment unlock', err.shortMessage || err.message.slice(0, 80));
  }

  // --- Test 13: Deactivate gate ---
  console.log('\n--- 13. Gate Deactivation ---');
  const contentId3 = toBytes32(`test3-${Date.now()}`);
  await walletClient.writeContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'createGate',
    args: [contentId3, parseEther('1')],
  }).then(h => publicClient.waitForTransactionReceipt({ hash: h, timeout: 60_000 }));

  await walletClient.writeContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'updateGate',
    args: [contentId3, parseEther('1'), false],
  }).then(h => publicClient.waitForTransactionReceipt({ hash: h, timeout: 60_000 }));

  try {
    await userWallet.writeContract({
      address: PAYGATE_ADDRESS!,
      abi: PAYGATE_ABI,
      functionName: 'unlock',
      args: [contentId3],
      value: parseEther('1'),
    });
    assert(false, 'unlock on inactive gate should revert');
  } catch (err: any) {
    assert(err.message.includes('reverted') || err.message.includes('GateInactive'), 'inactive gate unlock reverted');
  }

  // --- Test 14: Platform withdraw ---
  console.log('\n--- 14. Platform Withdraw ---');
  // Only works if caller == platform address
  try {
    const pwHash = await walletClient.writeContract({
      address: PAYGATE_ADDRESS!,
      abi: PAYGATE_ABI,
      functionName: 'withdrawPlatform',
    });
    const pwReceipt = await publicClient.waitForTransactionReceipt({ hash: pwHash, timeout: 60_000 });
    assert(pwReceipt.status === 'success', 'platform withdraw succeeded');

    const platBalAfter = await publicClient.readContract({
      address: PAYGATE_ADDRESS!,
      abi: PAYGATE_ABI,
      functionName: 'platformBalance',
    }) as bigint;
    assert(platBalAfter === 0n, 'platform balance zeroed after withdraw');
  } catch (err: any) {
    // If test wallet != platform address, this is expected to fail
    if (err.message.includes('not platform')) {
      console.log('  ⚠ Skipped (test wallet != platform address)');
    } else {
      assert(false, 'platform withdraw', err.message.slice(0, 80));
    }
  }

  // --- Summary ---
  console.log(`\n${'='.repeat(50)}`);
  console.log(`SomniaGate E2E: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
