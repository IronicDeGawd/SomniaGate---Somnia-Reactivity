import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Lock, Unlock, Wallet, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getGate, checkAccess, unlock as unlockGate, type Gate } from '@/lib/contract'
import { useAuthStore } from '@/store/auth'

const PAYGATE = '0x87300fb8ae589141271f8840439288f6603fe1f6'

function formatSTT(wei: bigint): string {
  const whole = wei / 10n ** 18n
  const frac = wei % 10n ** 18n
  const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

export default function GatePage() {
  const { id } = useParams<{ id: string }>()
  const { address, isConnected, connect } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'locked' | 'connecting' | 'paying' | 'confirming' | 'unlocked'>('loading')
  const [gate, setGate] = useState<Gate | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const g = await getGate(PAYGATE, id || '')
        setGate(g)
        if (isConnected && address) {
          const has = await checkAccess(PAYGATE, id || '', address)
          setStatus(has ? 'unlocked' : 'locked')
        } else {
          setStatus('locked')
        }
      } catch {
        setStatus('locked')
      }
    }
    load()
  }, [id, isConnected, address])

  const handleUnlock = async () => {
    if (!gate) return
    try {
      if (!isConnected) {
        setStatus('connecting')
        await connect()
      }
      const addr = useAuthStore.getState().address
      if (!addr) return

      const already = await checkAccess(PAYGATE, id || '', addr)
      if (already) { setStatus('unlocked'); return }

      setStatus('paying')
      toast.info('Confirm the transaction in your wallet')
      const txHash = await unlockGate(PAYGATE, id || '', gate.price, addr)

      setStatus('confirming')
      const provider = (window as any).ethereum
      for (let i = 0; i < 60; i++) {
        const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [txHash] }) as any
        if (receipt) {
          if (receipt.status === '0x0') throw new Error('Transaction reverted')
          break
        }
        await new Promise(r => setTimeout(r, 1000))
      }

      setStatus('unlocked')
      toast.success('Content unlocked!')
    } catch (err: any) {
      setStatus('locked')
      if (err.code === 4001) toast.error('Transaction cancelled')
      else toast.error(err.message?.slice(0, 60) || 'Failed')
    }
  }

  const statusMessages: Record<string, string> = {
    loading: 'Loading gate…',
    locked: 'Pay to unlock this content',
    connecting: 'Connecting wallet...',
    paying: 'Confirm payment in wallet...',
    confirming: 'Confirming on Somnia...',
    unlocked: 'Content unlocked!',
  }

  const priceStr = gate ? formatSTT(gate.price) : '…'
  const creatorCutStr = gate ? formatSTT(gate.price * 95n / 100n) : '…'

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-[#F3F3F3]">
      <div className="max-w-lg w-full">
        <div className="rounded-[45px] border border-[#191A23] bg-white overflow-hidden shadow-[0_5px_0_0_#191A23]">
          {/* Header */}
          <div className="p-6 border-b border-[#191A23]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#B9FF66] flex items-center justify-center">
                {status === 'unlocked'
                  ? <Unlock className="w-5 h-5 text-[#191A23]" />
                  : <Lock className="w-5 h-5 text-[#191A23]" />
                }
              </div>
              <div>
                <h1 className="text-[20px] font-medium text-[#191A23]">Premium Content</h1>
                <p className="text-sm text-[#191A23]/50">Gate: {id}</p>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="p-8 text-center space-y-6">
            {status === 'unlocked' ? (
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#B9FF66] flex items-center justify-center mx-auto">
                  <Unlock className="w-6 h-6 text-[#191A23]" />
                </div>
                <p className="text-base text-[#191A23]/70">
                  Content is now accessible. In production, the gated content would be loaded here from the creator's server.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-base text-[#191A23]/70">
                    {statusMessages[status]}
                  </p>
                  {status !== 'locked' && status !== 'loading' && (
                    <Loader2 className="w-5 h-5 text-[#191A23] animate-spin mx-auto" />
                  )}
                </div>

                <div className="rounded-[14px] bg-[#F3F3F3] border border-[#191A23]/20 p-4 space-y-2">
                  <div className="flex justify-between text-base">
                    <span className="text-[#191A23]/60">Price</span>
                    <span className="font-medium text-[#191A23]">{priceStr} STT</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-[#191A23]/60">Network</span>
                    <span className="font-medium text-[#191A23]">Somnia Testnet</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-[#191A23]/60">Creator receives</span>
                    <span className="font-medium text-green-600">{creatorCutStr} STT (95%)</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleUnlock}
                  disabled={status !== 'locked'}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {!isConnected ? 'Connect & Unlock' : `Unlock for ${priceStr} STT`}
                </Button>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-[#191A23]/20 bg-[#F3F3F3] flex items-center justify-center gap-2">
            <Zap className="w-3 h-3 text-[#191A23]" />
            <span className="text-[11px] text-[#191A23]/50">Powered by SomniaGate · Somnia Reactivity</span>
          </div>
        </div>
      </div>
    </div>
  )
}
