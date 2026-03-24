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
      { name: 'price', type: 'uint256' },
      { name: 'owner', type: 'address' },
      { name: 'active', type: 'bool' },
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
  checkAccess: '0x6d8ea5b4', // checkAccess(bytes32,address)
  getGate:     '0x5d0d70ef', // getGate(bytes32)
  createGate:  '0x9dbb0e8a', // createGate(bytes32,uint256)
  unlock:      '0xce0b63ce', // unlock(bytes32)
  withdraw:    '0x3ccfd60b', // withdraw()
} as const

function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet detected.')
  }
  return window.ethereum
}

// ABI encoding helpers

function encodeBytes32(value: string): string {
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
  price: bigint
  owner: string
  active: boolean
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

  const hex = result.replace('0x', '')
  const price = BigInt('0x' + hex.slice(0, 64))
  const owner = '0x' + hex.slice(64 + 24, 128)
  const active = BigInt('0x' + hex.slice(128, 192)) !== 0n

  return { price, owner, active }
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
