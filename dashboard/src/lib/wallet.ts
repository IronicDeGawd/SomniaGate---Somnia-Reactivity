const SOMNIA_CHAIN_ID = 50312
const SOMNIA_CHAIN_ID_HEX = `0x${SOMNIA_CHAIN_ID.toString(16)}`

const SOMNIA_NETWORK = {
  chainId: SOMNIA_CHAIN_ID_HEX,
  chainName: 'Somnia Testnet',
  nativeCurrency: {
    name: 'STT',
    symbol: 'STT',
    decimals: 18,
  },
  rpcUrls: ['https://dream-rpc.somnia.network'],
  blockExplorerUrls: ['https://shannon-explorer.somnia.network'],
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
    }
  }
}

function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet detected. Please install MetaMask or a compatible wallet.')
  }
  return window.ethereum
}

export async function connect(): Promise<string[]> {
  const provider = getProvider()
  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
  })) as string[]
  await ensureSomniaNetwork()
  return accounts
}

export async function disconnect(): Promise<void> {
  // EIP-1193 does not have a disconnect method — clear state in the app layer
}

export async function getAccounts(): Promise<string[]> {
  const provider = getProvider()
  return (await provider.request({ method: 'eth_accounts' })) as string[]
}

export async function ensureSomniaNetwork(): Promise<void> {
  const provider = getProvider()

  const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string

  if (currentChainId === SOMNIA_CHAIN_ID_HEX) return

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SOMNIA_CHAIN_ID_HEX }],
    })
  } catch (err: unknown) {
    // Chain not added yet — add it
    if ((err as { code?: number }).code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [SOMNIA_NETWORK],
      })
    } else {
      throw err
    }
  }
}

export function onAccountsChanged(handler: (accounts: string[]) => void): () => void {
  const provider = getProvider()
  const wrapped = (accounts: unknown) => handler(accounts as string[])
  provider.on('accountsChanged', wrapped)
  return () => provider.removeListener('accountsChanged', wrapped)
}

export function onChainChanged(handler: (chainId: string) => void): () => void {
  const provider = getProvider()
  const wrapped = (chainId: unknown) => handler(chainId as string)
  provider.on('chainChanged', wrapped)
  return () => provider.removeListener('chainChanged', wrapped)
}
