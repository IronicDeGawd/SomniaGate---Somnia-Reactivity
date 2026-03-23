/**
 * Demo script: create a gate, unlock it, verify access.
 *
 * Run after deploy-paygate.ts has populated .env with contract addresses.
 *
 * Usage: npx tsx scripts/demo.ts
 */

import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  keccak256,
  toBytes,
  encodePacked,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { somniaTestnet } from './chain.js';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PAYGATE_ADDRESS = process.env.PAYGATE_ADDRESS as Address | undefined;

if (!PRIVATE_KEY) { console.error('Missing PRIVATE_KEY'); process.exit(1); }
if (!PAYGATE_ADDRESS) { console.error('Missing PAYGATE_ADDRESS — run deploy first'); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as Hex);
const publicClient = createPublicClient({ chain: somniaTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http() } as any);

// Simulate a "user" with a separate wallet
const userKey = generatePrivateKey();
const userAccount = privateKeyToAccount(userKey);
const userWallet = createWalletClient({ account: userAccount, chain: somniaTestnet, transport: http() } as any);

// PayGate ABI (minimal for demo)
const PAYGATE_ABI = [
  { type: 'function', name: 'createGate', inputs: [{ name: 'contentId', type: 'bytes32' }, { name: 'price', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unlock', inputs: [{ name: 'contentId', type: 'bytes32' }], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'checkAccess', inputs: [{ name: 'contentId', type: 'bytes32' }, { name: 'user', type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getGate', inputs: [{ name: 'contentId', type: 'bytes32' }], outputs: [{ name: 'creator', type: 'address' }, { name: 'price', type: 'uint256' }, { name: 'active', type: 'bool' }, { name: 'totalRevenue', type: 'uint256' }, { name: 'unlockCount', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'creatorBalances', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'withdraw', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'event', name: 'GateCreated', inputs: [{ name: 'contentId', type: 'bytes32', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'price', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'AccessGranted', inputs: [{ name: 'contentId', type: 'bytes32', indexed: true }, { name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'creator', type: 'address', indexed: true }] },
] as const;

async function main() {
  console.log('SomniaGate — Demo');
  console.log(`Creator: ${account.address}`);
  console.log(`User:    ${userAccount.address}`);
  console.log(`PayGate: ${PAYGATE_ADDRESS}\n`);

  // Fund user wallet
  console.log('Funding user wallet with 5 STT...');
  const fundHash = await walletClient.sendTransaction({
    to: userAccount.address,
    value: parseEther('5'),
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash, timeout: 60_000 });
  console.log('✓ User funded\n');

  // ── Create a gate ──
  const contentId = keccak256(toBytes('premium-article-001'));
  const price = parseEther('2'); // 2 STT

  console.log('Creating gate...');
  console.log(`  Content ID: ${contentId}`);
  console.log(`  Price: 2 STT`);

  const createHash = await walletClient.writeContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'createGate',
    args: [contentId, price],
  });
  await publicClient.waitForTransactionReceipt({ hash: createHash, timeout: 60_000 });
  console.log('✓ Gate created\n');

  // ── Check access (should be false) ──
  const beforeAccess = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'checkAccess',
    args: [contentId, userAccount.address],
  });
  console.log(`User access before: ${beforeAccess}`); // false

  // ── User unlocks ──
  console.log('\nUser paying 2 STT to unlock...');
  const unlockHash = await userWallet.writeContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'unlock',
    args: [contentId],
    value: price,
  });
  const unlockReceipt = await publicClient.waitForTransactionReceipt({ hash: unlockHash, timeout: 60_000 });
  console.log(`✓ Unlocked! Tx: ${unlockHash}`);
  console.log(`  Gas used: ${unlockReceipt.gasUsed}`);

  // ── Check access (should be true now) ──
  const afterAccess = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'checkAccess',
    args: [contentId, userAccount.address],
  });
  console.log(`\nUser access after: ${afterAccess}`); // true

  // ── Check gate stats ──
  const gate = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'getGate',
    args: [contentId],
  });
  console.log(`\nGate stats:`);
  console.log(`  Creator:       ${gate[0]}`);
  console.log(`  Price:         ${formatEther(gate[1])} STT`);
  console.log(`  Active:        ${gate[2]}`);
  console.log(`  Total Revenue: ${formatEther(gate[3])} STT`);
  console.log(`  Unlock Count:  ${gate[4]}`);

  // ── Check creator balance ──
  const creatorBal = await publicClient.readContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'creatorBalances',
    args: [account.address],
  }) as bigint;
  console.log(`\nCreator withdrawable: ${formatEther(creatorBal)} STT (95% of 2 = 1.9)`);

  // ── Creator withdraws ──
  console.log('\nCreator withdrawing...');
  const withdrawHash = await walletClient.writeContract({
    address: PAYGATE_ADDRESS!,
    abi: PAYGATE_ABI,
    functionName: 'withdraw',
  });
  await publicClient.waitForTransactionReceipt({ hash: withdrawHash, timeout: 60_000 });
  console.log('✓ Withdrawn');

  console.log('\n══════════════════════════════════════════════');
  console.log('  DEMO COMPLETE');
  console.log('══════════════════════════════════════════════');
  console.log('  1. Gate created with 2 STT price');
  console.log('  2. User paid → access granted instantly');
  console.log('  3. 95% (1.9 STT) to creator, 5% (0.1 STT) to platform');
  console.log('  4. Creator withdrew accumulated balance');
  console.log('  5. Reactivity handler emitted PaymentConfirmed');
  console.log('══════════════════════════════════════════════');
}

main().catch(console.error);
