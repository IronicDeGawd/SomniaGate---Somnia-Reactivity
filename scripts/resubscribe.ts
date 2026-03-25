/**
 * Re-create subscription with isGuaranteed: true
 */
import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseGwei, keccak256, toBytes, type Hex, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from './chain.js';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
const publicClient = createPublicClient({ chain: somniaTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http() } as any);
const sdk = new SDK({ public: publicClient, wallet: walletClient });

const PAYGATE = process.env.PAYGATE_ADDRESS as Address;
const SPLITTER = process.env.SPLITTER_ADDRESS as Address;

async function main() {
  const topic = keccak256(toBytes('AccessGranted(bytes32,address,uint256,address)'));
  console.log('Re-subscribing with isGuaranteed: true...');
  console.log(`  Handler: ${SPLITTER}`);
  console.log(`  Emitter: ${PAYGATE}`);
  console.log(`  Topic:   ${topic}`);

  const result = await sdk.createSoliditySubscription({
    handlerContractAddress: SPLITTER,
    eventTopics: [topic],
    emitter: PAYGATE,
    priorityFeePerGas: parseGwei('10'),
    maxFeePerGas: parseGwei('20'),
    gasLimit: 3_000_000n,
    isGuaranteed: true,
    isCoalesced: false,
  });

  if (result instanceof Error) {
    console.error('✗ Failed:', result.message);
  } else {
    console.log('✓ Subscribed:', result);
  }
}

main().catch(console.error);
