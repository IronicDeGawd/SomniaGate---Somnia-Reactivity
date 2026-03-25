// PayGate contract ABI (minimal subset used by the dashboard)
export const PAYGATE_ABI = [
  {
    name: 'checkAccess',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'contentId', type: 'bytes32' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getGate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'contentId', type: 'bytes32' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'totalRevenue', type: 'uint256' },
      { name: 'unlockCount', type: 'uint256' },
    ],
  },
  {
    name: 'createGate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contentId', type: 'bytes32' },
      { name: 'price', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'unlock',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'contentId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const

// Function selectors (keccak256 of the signature, first 4 bytes)
export const SELECTORS = {
  checkAccess: '0x3e1fd0da', // checkAccess(bytes32,address)
  getGate:     '0xec661841', // getGate(bytes32)
  createGate:  '0xcbaa224e', // createGate(bytes32,uint256)
  unlock:      '0xec9b5b3a', // unlock(bytes32)
  withdraw:    '0x3ccfd60b', // withdraw()
} as const

function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet detected.')
  }
  return window.ethereum
}

// ABI encoding helpers

export function encodeBytes32(value: string): string {
  if (value.startsWith('0x')) {
    return value.slice(2).padEnd(64, '0')
  }
  // Encode UTF-8 string as right-padded bytes32 (no Buffer dependency)
  const hex = Array.from(new TextEncoder().encode(value))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.padEnd(64, '0')
}

function encodeAddress(address: string): string {
  return address.replace('0x', '').padStart(64, '0')
}

function encodeUint256(value: bigint): string {
  return value.toString(16).padStart(64, '0')
}

// Read helpers

export async function checkAccess(
  contractAddress: string,
  contentId: string,
  userAddress: string,
): Promise<boolean> {
  const provider = getProvider()
  const data =
    SELECTORS.checkAccess +
    encodeBytes32(contentId) +
    encodeAddress(userAddress)

  const result = (await provider.request({
    method: 'eth_call',
    params: [{ to: contractAddress, data }, 'latest'],
  })) as string

  return BigInt(result) !== 0n
}

export interface Gate {
  creator: string
  price: bigint
  active: boolean
  totalRevenue: bigint
  unlockCount: bigint
}

export async function getGate(
  contractAddress: string,
  contentId: string,
): Promise<Gate> {
  const provider = getProvider()
  const data = SELECTORS.getGate + encodeBytes32(contentId)

  const result = (await provider.request({
    method: 'eth_call',
    params: [{ to: contractAddress, data }, 'latest'],
  })) as string

  // Contract returns: (address creator, uint256 price, bool active, uint256 totalRevenue, uint256 unlockCount)
  const hex = result.replace('0x', '')
  const creator = '0x' + hex.slice(24, 64)           // slot 0: address (last 20 bytes of 32)
  const price = BigInt('0x' + (hex.slice(64, 128) || '0'))   // slot 1: uint256
  const active = BigInt('0x' + (hex.slice(128, 192) || '0')) !== 0n // slot 2: bool
  const totalRevenue = BigInt('0x' + (hex.slice(192, 256) || '0'))  // slot 3
  const unlockCount = BigInt('0x' + (hex.slice(256, 320) || '0'))   // slot 4

  return { creator, price, active, totalRevenue, unlockCount }
}

// Write helpers

export async function createGate(
  contractAddress: string,
  contentId: string,
  price: bigint,
  from: string,
): Promise<string> {
  const provider = getProvider()
  const data =
    SELECTORS.createGate +
    encodeBytes32(contentId) +
    encodeUint256(price)

  return (await provider.request({
    method: 'eth_sendTransaction',
    params: [{ from, to: contractAddress, data }],
  })) as string
}

export async function unlock(
  contractAddress: string,
  contentId: string,
  price: bigint,
  from: string,
): Promise<string> {
  const provider = getProvider()
  const data = SELECTORS.unlock + encodeBytes32(contentId)

  return (await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: contractAddress,
        data,
        value: '0x' + price.toString(16),
      },
    ],
  })) as string
}

export async function withdraw(
  contractAddress: string,
  from: string,
): Promise<string> {
  const provider = getProvider()

  return (await provider.request({
    method: 'eth_sendTransaction',
    params: [{ from, to: contractAddress, data: SELECTORS.withdraw }],
  })) as string
}
