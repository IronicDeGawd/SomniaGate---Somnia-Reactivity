export const PAYGATE_ABI = [
  {
    type: 'function', name: 'checkAccess',
    inputs: [{ name: 'contentId', type: 'bytes32' }, { name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }], stateMutability: 'view',
  },
  {
    type: 'function', name: 'getGate',
    inputs: [{ name: 'contentId', type: 'bytes32' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'totalRevenue', type: 'uint256' },
      { name: 'unlockCount', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'unlock',
    inputs: [{ name: 'contentId', type: 'bytes32' }],
    outputs: [], stateMutability: 'payable',
  },
] as const;

export const SOMNIA_TESTNET = {
  chainId: '0xC488', // 50312
  chainName: 'Somnia Testnet',
  rpcUrls: ['https://dream-rpc.somnia.network/'],
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  blockExplorerUrls: ['https://shannon-explorer.somnia.network'],
};
