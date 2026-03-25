/**
 * Deploy PayGate + GateSplitter to Somnia testnet.
 *
 * Usage:
 *   1. cp .env.example .env && add PRIVATE_KEY
 *   2. npx tsx scripts/deploy-paygate.ts
 */

import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  parseGwei,
  keccak256,
  toBytes,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from './chain.js';
import { compileFromFile } from './compile.js';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error('Missing PRIVATE_KEY in .env'); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as Hex);
const publicClient = createPublicClient({ chain: somniaTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http() } as any);
const sdk = new SDK({ public: publicClient, wallet: walletClient });

const PLATFORM_ADDRESS = (process.env.PLATFORM_ADDRESS || account.address) as Address;

async function main() {
  console.log('SomniaGate — Contract Deployment');
  console.log(`Wallet:   ${account.address}`);
  console.log(`Platform: ${PLATFORM_ADDRESS}\n`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${formatEther(balance)} STT`);
  if (balance < parseEther('20')) {
    console.error('Need at least 20 STT');
    process.exit(1);
  }

  // ── Step 1: Compile ──
  console.log('\nCompiling contracts...');
  const paygate = compileFromFile('PayGate');
  console.log(`  PayGate:      ${paygate.bytecode.length} chars, ${paygate.abi.length} ABI entries`);

  const splitter = compileFromFile('GateSplitter');
  console.log(`  GateSplitter: ${splitter.bytecode.length} chars, ${splitter.abi.length} ABI entries`);

  // ── Step 2: Deploy PayGate ──
  console.log('\nDeploying PayGate...');
  const pgHash = await walletClient.deployContract({
    abi: paygate.abi,
    bytecode: paygate.bytecode as Hex,
    args: [PLATFORM_ADDRESS],
  });
  console.log(`  Tx: ${pgHash}`);

  const pgReceipt = await publicClient.waitForTransactionReceipt({ hash: pgHash, timeout: 60_000 });
  const pgAddress = pgReceipt.contractAddress!;
  console.log(`  ✓ PayGate deployed at: ${pgAddress}`);
  console.log(`  Gas used: ${pgReceipt.gasUsed}`);

  // ── Step 3: Deploy GateSplitter (Reactivity handler) ──
  console.log('\nDeploying GateSplitter...');
  const gsHash = await walletClient.deployContract({
    abi: splitter.abi,
    bytecode: splitter.bytecode as Hex,
    args: [pgAddress],
  });
  console.log(`  Tx: ${gsHash}`);

  const gsReceipt = await publicClient.waitForTransactionReceipt({ hash: gsHash, timeout: 60_000 });
  const gsAddress = gsReceipt.contractAddress!;
  console.log(`  ✓ GateSplitter deployed at: ${gsAddress}`);
  console.log(`  Gas used: ${gsReceipt.gasUsed}`);

  // ── Step 4: Fund GateSplitter with STT for execution gas ──
  console.log('\nFunding GateSplitter with 33 STT (min 32 required for Reactivity)...');
  const fundHash = await walletClient.sendTransaction({
    to: gsAddress,
    value: parseEther('33'),
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash, timeout: 60_000 });
  console.log('  ✓ Funded');

  // ── Step 5: Subscribe via Reactivity ──
  console.log('\nCreating Reactivity subscription...');
  const accessGrantedTopic = keccak256(
    toBytes('AccessGranted(bytes32,address,uint256,address)')
  );

  try {
    const result = await sdk.createSoliditySubscription({
      handlerContractAddress: gsAddress,
      eventTopics: [accessGrantedTopic],
      emitter: pgAddress,
      priorityFeePerGas: parseGwei('10'),
      maxFeePerGas: parseGwei('20'),
      gasLimit: 3_000_000n,
      isGuaranteed: true,
      isCoalesced: false,
    });

    if (result instanceof Error) {
      console.error(`  ✗ Subscription failed: ${result.message}`);
    } else {
      console.log(`  ✓ Subscribed: ${result}`);
    }
  } catch (err: any) {
    console.error(`  ✗ Subscription error: ${err.message}`);
  }

  // ── Done ──
  console.log('\n══════════════════════════════════════════════');
  console.log('  SOMNIAGATE DEPLOYED');
  console.log('══════════════════════════════════════════════');
  console.log(`  PayGate:      ${pgAddress}`);
  console.log(`  GateSplitter: ${gsAddress}`);
  console.log(`  Platform:     ${PLATFORM_ADDRESS}`);
  console.log(`  Fee:          5%`);
  console.log('');
  console.log('  Add to .env:');
  console.log(`  PAYGATE_ADDRESS=${pgAddress}`);
  console.log(`  SPLITTER_ADDRESS=${gsAddress}`);
  console.log('');
  console.log('  Explorer:');
  console.log(`  https://shannon-explorer.somnia.network/address/${pgAddress}`);
  console.log(`  https://shannon-explorer.somnia.network/address/${gsAddress}`);
  console.log('══════════════════════════════════════════════');
}

main().catch(console.error);
