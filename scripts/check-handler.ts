import { createPublicClient, http, defineChain, keccak256, toBytes, formatEther } from 'viem';

const chain = defineChain({
  id: 50312, name: 'Somnia Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: { default: { http: ['https://dream-rpc.somnia.network/'] } },
});

const client = createPublicClient({ chain, transport: http() });

const SPLITTER = '0xec5ce4acd506db15ed71175e47e5afd5e0bbf765' as const;
const PAYGATE = '0x87300fb8ae589141271f8840439288f6603fe1f6' as const;

async function main() {
  // Check handler balance
  const bal = await client.getBalance({ address: SPLITTER });
  console.log(`GateSplitter balance: ${formatEther(bal)} STT (need 32+)`);

  // Check handler code exists
  const code = await client.getCode({ address: SPLITTER });
  console.log(`GateSplitter code: ${code ? code.length + ' chars' : 'NONE'}`);

  // Check confirmationCount on handler
  try {
    const count = await client.readContract({
      address: SPLITTER,
      abi: [{ type: 'function', name: 'confirmationCount', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
      functionName: 'confirmationCount',
    });
    console.log(`Confirmation count: ${count}`);
  } catch (e: any) {
    console.log(`confirmationCount error: ${e.message.slice(0, 80)}`);
  }

  // Get current block for range queries
  const currentBlock = await client.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);

  // Check PayGate AccessGranted events (these are what the handler subscribes to)
  const accessGrantedTopic = keccak256(toBytes('AccessGranted(bytes32,address,uint256,address)'));
  console.log(`\nAccessGranted topic: ${accessGrantedTopic}`);

  const paygateLogs = await client.getLogs({
    address: PAYGATE,
    event: {
      type: 'event',
      name: 'AccessGranted',
      inputs: [
        { name: 'contentId', type: 'bytes32', indexed: true },
        { name: 'user', type: 'address', indexed: true },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'creator', type: 'address', indexed: true },
      ],
    },
    fromBlock: currentBlock - 500n,
    toBlock: 'latest',
  });
  console.log(`PayGate AccessGranted events (last 500 blocks): ${paygateLogs.length}`);
  for (const log of paygateLogs) {
    console.log(`  Block ${log.blockNumber}: user=${log.args.user}, amount=${log.args.amount ? formatEther(log.args.amount) : '?'} STT`);
  }

  // Check GateSplitter PaymentConfirmed events
  const splitterLogs = await client.getLogs({
    address: SPLITTER,
    event: {
      type: 'event',
      name: 'PaymentConfirmed',
      inputs: [
        { name: 'contentId', type: 'bytes32', indexed: true },
        { name: 'user', type: 'address', indexed: true },
        { name: 'amount', type: 'uint256', indexed: false },
        { name: 'creator', type: 'address', indexed: true },
      ],
    },
    fromBlock: 'earliest',
    toBlock: 'latest',
  });
  console.log(`\nGateSplitter PaymentConfirmed events: ${splitterLogs.length}`);
  for (const log of splitterLogs) {
    console.log(`  Block ${log.blockNumber}: user=${log.args.user}, amount=${log.args.amount ? formatEther(log.args.amount) : '?'} STT`);
  }

  if (paygateLogs.length > 0 && splitterLogs.length === 0) {
    console.log('\n⚠ PayGate emitted AccessGranted but GateSplitter has no PaymentConfirmed.');
    console.log('  This means Reactivity is NOT routing events to the handler.');
    console.log('  Possible causes:');
    console.log('  - Handler balance < 32 STT');
    console.log('  - Subscription not created correctly');
    console.log('  - Event topic mismatch in subscription');
  } else if (splitterLogs.length > 0) {
    console.log('\n✓ Reactivity is working! Handler received and processed events.');
  }
}

main().catch(console.error);
