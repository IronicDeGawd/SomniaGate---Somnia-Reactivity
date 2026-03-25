import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseEther, formatEther, defineChain, type Hex, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from './chain.js';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
const publicClient = createPublicClient({ chain: somniaTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http() } as any);

const PAYGATE = process.env.PAYGATE_ADDRESS as Address;
const SPLITTER = process.env.SPLITTER_ADDRESS as Address;

const ABI = [
  { type: 'function', name: 'createGate', inputs: [{ name: 'contentId', type: 'bytes32' }, { name: 'price', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unlock', inputs: [{ name: 'contentId', type: 'bytes32' }], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'confirmationCount', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'payGateAddress', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
] as const;

async function main() {
  console.log('=== Reactivity Delivery Check ===\n');
  console.log(`PayGate:      ${PAYGATE}`);
  console.log(`GateSplitter: ${SPLITTER}`);

  // Verify handler is pointing at correct PayGate
  const storedPaygate = await publicClient.readContract({ address: SPLITTER, abi: ABI, functionName: 'payGateAddress' });
  console.log(`\nHandler's payGateAddress: ${storedPaygate}`);
  console.log(`Match: ${storedPaygate.toLowerCase() === PAYGATE.toLowerCase() ? '✓' : '✗ MISMATCH'}`);

  // Check balance
  const bal = await publicClient.getBalance({ address: SPLITTER });
  console.log(`Handler balance: ${formatEther(bal)} STT ${bal >= 32n * 10n ** 18n ? '✓' : '✗ BELOW 32'}`);

  // Read confirmationCount before
  const before = await publicClient.readContract({ address: SPLITTER, abi: ABI, functionName: 'confirmationCount' });
  console.log(`\nConfirmation count before: ${before}`);

  // Create gate + unlock
  const cid = ('0x' + Buffer.from('rx-check-' + Date.now()).toString('hex').padEnd(64, '0')) as Hex;
  console.log('\nCreating gate (0.01 STT)...');
  const ch = await walletClient.writeContract({ address: PAYGATE, abi: ABI, functionName: 'createGate', args: [cid, parseEther('0.01')] });
  await publicClient.waitForTransactionReceipt({ hash: ch, timeout: 60_000 });
  console.log('✓ Gate created');

  console.log('Unlocking...');
  const uh = await walletClient.writeContract({ address: PAYGATE, abi: ABI, functionName: 'unlock', args: [cid], value: parseEther('0.01') });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: uh, timeout: 60_000 });
  console.log(`✓ Unlock confirmed at block ${receipt.blockNumber}`);

  // Poll confirmationCount
  for (let wait = 1; wait <= 15; wait++) {
    await new Promise(r => setTimeout(r, 1000));
    const after = await publicClient.readContract({ address: SPLITTER, abi: ABI, functionName: 'confirmationCount' });
    if (after > before) {
      console.log(`\n✓ Reactivity delivered after ~${wait}s! confirmationCount: ${before} → ${after}`);
      return;
    }
    process.stdout.write(`  ${wait}s...`);
  }

  console.log(`\n✗ No delivery after 15s. confirmationCount still ${before}`);
  console.log('\nPossible causes:');
  console.log('  - Subscription event topic mismatch');
  console.log('  - Subscription emitter address mismatch');
  console.log('  - Testnet Reactivity service issue');
  console.log('  - Handler gas too low (current gasLimit: 500k)');
}

main().catch(console.error);
