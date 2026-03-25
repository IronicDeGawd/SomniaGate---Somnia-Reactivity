import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { connect as walletConnect, getAccounts } from '@/lib/wallet'

interface AuthState {
  address: string | null
  isConnected: boolean
  isRegistered: boolean
  apiKey: string | null
  error: string | null

  connect: () => Promise<void>
  disconnect: () => void
  register: () => Promise<void>
  verifySession: () => Promise<void>
}

function getProvider(): any {
  const w = window as any
  if (!w.ethereum) throw new Error('No wallet found. Install MetaMask.')
  return w.ethereum
}

/**
 * Derive a deterministic API key from a wallet signature using SHA-256.
 * Production would use server-side key issuance; this is a hackathon shortcut
 * that at least ties the key to a proven wallet ownership.
 */
async function deriveApiKey(signature: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(signature)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `sg_${hex.slice(0, 32)}`
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      address: null,
      isConnected: false,
      isRegistered: false,
      apiKey: null,
      error: null,

      connect: async () => {
        try {
          const accounts = await walletConnect()
          set({ address: accounts[0] ?? null, isConnected: true, error: null })
        } catch (e) {
          set({ error: (e as Error).message })
          throw e
        }
      },

      disconnect: () => {
        set({ address: null, isConnected: false, isRegistered: false, apiKey: null })
      },

      register: async () => {
        const { address, isConnected } = get()
        if (!isConnected || !address) {
          await get().connect()
        }

        const addr = get().address
        if (!addr) throw new Error('Wallet not connected')

        // Sign a message to prove ownership
        const provider = getProvider()
        const message = `Register with SomniaGate\nWallet: ${addr}\nTimestamp: ${Date.now()}`
        const signature = await provider.request({
          method: 'personal_sign',
          params: [message, addr],
        })

        // Derive API key deterministically from wallet signature
        const key = await deriveApiKey(signature as string)

        set({ isRegistered: true, apiKey: key })
      },

      /**
       * Verify that the stored session matches the currently connected wallet.
       * Clears auth state if the wallet address has changed or is disconnected.
       */
      verifySession: async () => {
        const { address, isConnected } = get()
        if (!isConnected || !address) return

        try {
          const accounts = await getAccounts()
          const currentAddress = accounts[0]?.toLowerCase()
          const storedAddress = address.toLowerCase()

          if (!currentAddress || currentAddress !== storedAddress) {
            set({ address: null, isConnected: false, isRegistered: false, apiKey: null })
          }
        } catch {
          // Wallet not available (e.g. extension removed) -- clear state
          set({ address: null, isConnected: false, isRegistered: false, apiKey: null })
        }
      },
    }),
    {
      name: 'somniagate-auth',
      partialize: (state) => ({
        address: state.address,
        isConnected: state.isConnected,
        isRegistered: state.isRegistered,
        apiKey: state.apiKey,
      }),
    },
  ),
)
