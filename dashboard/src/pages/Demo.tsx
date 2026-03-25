import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Wallet, Lock, Unlock, Loader2, ExternalLink, Copy, Check,
  Zap, ArrowRight, Eye, Sparkles, ChevronRight, Sun, Moon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SectionHeading } from '@/components/ui/heading'
import { useAuthStore } from '@/store/auth'
import { checkAccess, getGate, unlock, createGate, type Gate } from '@/lib/contract'

const PAYGATE = '0x87300fb8ae589141271f8840439288f6603fe1f6'
const SPLITTER = '0xec5ce4acd506db15ed71175e47e5afd5e0bbf765'
const EXPLORER = 'https://shannon-explorer.somnia.network'
const WS_URL = 'wss://dream-rpc.somnia.network/ws'
const RPC = 'https://dream-rpc.somnia.network/'
const DEMO_CONTENT_ID = 'demo-article'

// Precomputed topic hashes
const PAYMENT_CONFIRMED_TOPIC = '0x83472785bc544b42f9ebee31aa81b3170b4812ac086a7451c7337c9b56c2a1f0'

/**
 * Watch for Reactivity events via Somnia's native `somnia_watch` WebSocket subscription.
 * This is the same protocol the @somnia-chain/reactivity SDK uses internally —
 * replicated here with the browser's native WebSocket API.
 *
 * Returns a promise that resolves with the event data when a matching event arrives,
 * plus a cleanup function.
 */
function watchReactivityEvent(
  contractAddress: string,
  topic: string,
  timeoutMs = 30_000,
): { promise: Promise<{ topics: string[]; data: string } | null>; cleanup: () => void } {
  let ws: WebSocket | null = null
  let resolved = false
  let resolvePromise: (val: { topics: string[]; data: string } | null) => void

  const promise = new Promise<{ topics: string[]; data: string } | null>((resolve) => {
    resolvePromise = resolve

    try {
      ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        // Send somnia_watch subscription (same JSON-RPC the SDK sends)
        ws!.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_subscribe',
          params: ['somnia_watch', {
            address: [contractAddress],
            topics: [topic],
            eth_calls: [],
            push_changes_only: false,
          }],
        }))
      }

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          // Subscription confirmations have { id, result: subscriptionId }
          // Event pushes have { method: 'eth_subscription', params: { subscription, result } }
          if (msg.method === 'eth_subscription' && msg.params?.result && !resolved) {
            resolved = true
            resolve({
              topics: msg.params.result.topics || [],
              data: msg.params.result.data || '0x',
            })
          }
        } catch { /* ignore parse errors */ }
      }

      ws.onerror = () => {
        if (!resolved) { resolved = true; resolve(null) }
      }

      // Timeout fallback
      setTimeout(() => {
        if (!resolved) { resolved = true; resolve(null) }
      }, timeoutMs)

    } catch {
      resolve(null)
    }
  })

  const cleanup = () => {
    if (!resolved) { resolved = true; resolvePromise(null) }
    if (ws && ws.readyState <= WebSocket.OPEN) {
      ws.close()
    }
  }

  return { promise, cleanup }
}

// Fallback: poll confirmationCount via RPC if WebSocket fails
async function getConfirmationCount(): Promise<bigint> {
  const selector = '0x7ac3e4e6'
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: SPLITTER, data: selector }, 'latest'] }),
  })
  const json = await res.json()
  return BigInt(json.result || '0x0')
}

/* ── Animation variants ── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

/* ── Helpers ── */

function formatSTT(wei: bigint): string {
  const whole = wei / 10n ** 18n
  const frac = wei % 10n ** 18n
  const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

function CopyBtn({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={`inline-flex items-center gap-1.5 text-sm text-[#191A23]/60 hover:text-[#191A23] transition-colors ${className ?? ''}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/* ── Section 1: Try It ── */

type UnlockStatus = 'loading' | 'locked' | 'connecting' | 'paying' | 'confirming' | 'unlocked'

interface ReactivityState {
  confirmed: boolean
  delayMs: number | null
  method: 'websocket' | 'polling' | null
}

function TryItSection() {
  const { address, isConnected, connect } = useAuthStore()
  const [status, setStatus] = useState<UnlockStatus>('loading')
  const [gate, setGate] = useState<Gate | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [gasUsed, setGasUsed] = useState<string | null>(null)
  const [reactivity, setReactivity] = useState<ReactivityState>({ confirmed: false, delayMs: null, method: null })

  useEffect(() => {
    async function check() {
      try {
        const g = await getGate(PAYGATE, DEMO_CONTENT_ID)
        setGate(g)
        if (isConnected && address) {
          const has = await checkAccess(PAYGATE, DEMO_CONTENT_ID, address)
          setStatus(has ? 'unlocked' : 'locked')
        } else {
          setStatus('locked')
        }
      } catch {
        setStatus('locked')
      }
    }
    check()
  }, [isConnected, address])

  const handleUnlock = async () => {
    try {
      if (!isConnected) {
        setStatus('connecting')
        await connect()
      }
      const addr = useAuthStore.getState().address
      if (!addr || !gate) return

      // Check access first
      const already = await checkAccess(PAYGATE, DEMO_CONTENT_ID, addr)
      if (already) { setStatus('unlocked'); return }

      setReactivity({ confirmed: false, delayMs: null, method: null })

      // Start Reactivity WebSocket watch BEFORE sending tx
      // This way we catch the push event as soon as the handler fires
      const { promise: wsPromise, cleanup: wsCleanup } = watchReactivityEvent(
        SPLITTER, PAYMENT_CONFIRMED_TOPIC, 30_000,
      )
      const beforeCount = await getConfirmationCount()

      setStatus('paying')
      toast.info('Confirm the transaction in your wallet')
      const hash = await unlock(PAYGATE, DEMO_CONTENT_ID, gate.price, addr)
      setTxHash(hash)
      setStatus('confirming')
      const txSentAt = Date.now()

      // Poll receipt
      const provider = (window as any).ethereum
      for (let i = 0; i < 60; i++) {
        const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [hash] }) as any
        if (receipt) {
          if (receipt.status === '0x0') throw new Error('Transaction reverted')
          setGasUsed(parseInt(receipt.gasUsed, 16).toLocaleString())
          break
        }
        await new Promise(r => setTimeout(r, 1000))
      }
      setStatus('unlocked')
      toast.success('Content unlocked!')

      // Wait for Reactivity: WebSocket push OR polling fallback
      const wsResult = await wsPromise
      wsCleanup()

      if (wsResult) {
        // Reactivity delivered via WebSocket push
        setReactivity({ confirmed: true, delayMs: Date.now() - txSentAt, method: 'websocket' })
      } else {
        // WebSocket didn't deliver — fall back to polling confirmationCount
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000))
          const newCount = await getConfirmationCount()
          if (newCount > beforeCount) {
            setReactivity({ confirmed: true, delayMs: Date.now() - txSentAt, method: 'polling' })
            break
          }
        }
      }
    } catch (err: any) {
      setStatus('locked')
      if (err.code === 4001) toast.error('Transaction cancelled')
      else toast.error(err.message?.slice(0, 80) || 'Failed')
    }
  }

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} custom={0}>
            <SectionHeading label="Try It" title="Unlock Premium Content" variant="green" />
            <p className="mt-4 max-w-2xl text-lg text-[#191A23]/60">
              This is a live demo running on Somnia testnet. Connect your wallet and pay 0.001 STT to unlock the content below.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={1} className="mt-12">
            <Card className="overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0">
                {/* Left: content preview */}
                <div className="relative p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-[#191A23]/10">
                  <div className={`space-y-4 transition-all duration-700 ${status === 'unlocked' ? '' : 'blur-md select-none pointer-events-none'}`}>
                    <h3 className="text-[24px] font-medium text-[#191A23]">The Future of On-Chain Monetization</h3>
                    <p className="text-[#191A23]/70 leading-relaxed">
                      Traditional paywalls rely on centralized servers, payment processors, and monthly subscriptions.
                      SomniaGate replaces all of that with a single smart contract. Creators set a price, embed one line
                      of code, and users pay directly from their wallet. No accounts, no credit cards, no middlemen.
                    </p>
                    <p className="text-[#191A23]/70 leading-relaxed">
                      With Somnia Reactivity, the moment a payment is confirmed on-chain, validators push a callback to
                      the handler contract — unlocking content in under 100ms. No polling, no webhooks, no delays.
                    </p>
                    <div className="rounded-[14px] bg-[#B9FF66]/10 border border-[#B9FF66]/30 p-4">
                      <p className="text-sm font-medium text-[#191A23]">
                        Key insight: 95% of every payment goes directly to the creator's on-chain balance.
                        Withdraw anytime, no minimums.
                      </p>
                    </div>
                  </div>

                  {/* Lock overlay */}
                  {status !== 'unlocked' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-[#B9FF66] flex items-center justify-center mx-auto">
                          <Lock className="w-5 h-5 text-[#191A23]" />
                        </div>
                        <p className="text-sm font-medium text-[#191A23]">Premium Content</p>
                        <p className="text-xs text-[#191A23]/50">Unlock to read the full article</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: action panel */}
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  {status === 'unlocked' ? (
                    <div className="space-y-6">
                      <div className="w-14 h-14 rounded-full bg-[#B9FF66] flex items-center justify-center">
                        <Unlock className="w-6 h-6 text-[#191A23]" />
                      </div>
                      <div>
                        <h4 className="text-[20px] font-medium text-[#191A23]">Content Unlocked</h4>
                        <p className="mt-1 text-[#191A23]/60">You now have permanent access to this content.</p>
                      </div>

                      {txHash && (
                        <div className="rounded-[14px] bg-[#F3F3F3] border border-[#191A23]/10 p-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#191A23]/50">Transaction</span>
                            <a
                              href={`${EXPLORER}/tx/${txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[#191A23] hover:underline font-mono text-xs"
                            >
                              {txHash.slice(0, 10)}…{txHash.slice(-6)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          {gasUsed && (
                            <div className="flex justify-between">
                              <span className="text-[#191A23]/50">Gas used</span>
                              <span className="font-mono text-xs text-[#191A23]">{gasUsed}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-[#191A23]/50">Network</span>
                            <span className="text-[#191A23]">Somnia Testnet</span>
                          </div>
                        </div>
                      )}

                      {/* Reactivity Timeline */}
                      {txHash && (
                        <div className="rounded-[14px] border border-[#191A23]/10 overflow-hidden">
                          <div className="px-4 py-2.5 bg-[#191A23] text-white flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-[#B9FF66]" />
                            <span className="text-xs font-medium">Somnia Reactivity</span>
                          </div>
                          <div className="p-4 space-y-3">
                            {/* Step 1: Payment */}
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 w-5 h-5 rounded-full bg-[#B9FF66] flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 text-[#191A23]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#191A23]">Payment confirmed on-chain</p>
                                <p className="text-xs text-[#191A23]/40">AccessGranted event emitted by PayGate</p>
                              </div>
                            </div>

                            {/* Step 2: Reactivity callback */}
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                reactivity.confirmed ? 'bg-[#B9FF66]' : 'bg-[#F3F3F3] border border-[#191A23]/20'
                              }`}>
                                {reactivity.confirmed
                                  ? <Check className="w-3 h-3 text-[#191A23]" />
                                  : <Loader2 className="w-3 h-3 text-[#191A23]/40 animate-spin" />
                                }
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#191A23]">
                                  {reactivity.confirmed ? 'Reactivity handler invoked' : 'Waiting for Reactivity callback…'}
                                </p>
                                <p className="text-xs text-[#191A23]/40">
                                  {reactivity.confirmed
                                    ? `Delivered in ~${((reactivity.delayMs ?? 0) / 1000).toFixed(1)}s via ${reactivity.method === 'websocket' ? 'somnia_watch WebSocket push' : 'RPC polling fallback'}`
                                    : 'Validators detect AccessGranted → invoke GateSplitter handler'
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Step 3: Confirmation */}
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                reactivity.confirmed ? 'bg-[#B9FF66]' : 'bg-[#F3F3F3] border border-[#191A23]/20'
                              }`}>
                                {reactivity.confirmed
                                  ? <Check className="w-3 h-3 text-[#191A23]" />
                                  : <div className="w-1.5 h-1.5 rounded-full bg-[#191A23]/20" />
                                }
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${reactivity.confirmed ? 'text-[#191A23]' : 'text-[#191A23]/40'}`}>
                                  {reactivity.confirmed ? 'PaymentConfirmed event emitted' : 'Pending handler confirmation'}
                                </p>
                                <p className="text-xs text-[#191A23]/40">
                                  {reactivity.confirmed
                                    ? `PaymentConfirmed event ${reactivity.method === 'websocket' ? 'pushed to browser via WebSocket — no polling needed' : 'detected via on-chain state change'}`
                                    : 'GateSplitter emits PaymentConfirmed for real-time widget updates'
                                  }
                                </p>
                              </div>
                            </div>

                            {reactivity.confirmed && (
                              <div className="mt-2 pt-3 border-t border-[#191A23]/10 text-center">
                                <p className="text-xs text-[#191A23]/50">
                                  {reactivity.method === 'websocket' ? 'Protocol: somnia_watch · ' : ''}
                                  Handler: <span className="font-mono">{SPLITTER.slice(0, 8)}…{SPLITTER.slice(-4)}</span>
                                  {' · '}Delivery: <span className="font-medium text-[#191A23]">~{((reactivity.delayMs ?? 0) / 1000).toFixed(1)}s</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[20px] font-medium text-[#191A23]">Unlock This Article</h4>
                        <p className="mt-1 text-[#191A23]/60">
                          {status === 'loading' ? 'Loading gate...' :
                           status === 'connecting' ? 'Connecting wallet...' :
                           status === 'paying' ? 'Confirm in your wallet...' :
                           status === 'confirming' ? 'Confirming on Somnia...' :
                           'Pay once, access forever.'}
                        </p>
                      </div>

                      <div className="rounded-[14px] bg-[#F3F3F3] border border-[#191A23]/10 p-4 space-y-2">
                        <div className="flex justify-between text-base">
                          <span className="text-[#191A23]/50">Price</span>
                          <span className="font-medium text-[#191A23]">{gate ? formatSTT(gate.price) : '…'} STT</span>
                        </div>
                        <div className="flex justify-between text-base">
                          <span className="text-[#191A23]/50">Creator receives</span>
                          <span className="font-medium text-green-600">{gate ? formatSTT(gate.price * 95n / 100n) : '…'} STT (95%)</span>
                        </div>
                        <div className="flex justify-between text-base">
                          <span className="text-[#191A23]/50">Unlocks</span>
                          <span className="text-[#191A23]">{gate ? gate.unlockCount.toString() : '…'}</span>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleUnlock}
                        disabled={status !== 'locked'}
                      >
                        {status !== 'locked' && status !== 'loading' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Wallet className="w-4 h-4 mr-2" />
                        )}
                        {!isConnected ? 'Connect & Unlock' : `Unlock for ${gate ? formatSTT(gate.price) : '…'} STT`}
                      </Button>

                      <p className="text-xs text-center text-[#191A23]/40">
                        Requires a wallet with STT on Somnia testnet.{' '}
                        <a href="https://testnet.somnia.network" target="_blank" rel="noreferrer" className="underline">
                          Get free STT
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ── Section 2: Create Your Own ── */

function CreateSection() {
  const { isConnected, connect } = useAuthStore()
  const [contentId, setContentId] = useState('')
  const [price, setPrice] = useState('')
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ contentId: string; txHash: string } | null>(null)

  const handleCreate = async () => {
    if (!contentId.trim() || !price.trim()) {
      toast.error('Fill in both fields')
      return
    }
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Price must be a positive number')
      return
    }

    try {
      if (!isConnected) await connect()
      const addr = useAuthStore.getState().address
      if (!addr) return

      setCreating(true)
      const priceWei = BigInt(Math.round(priceNum * 1e18))
      const txHash = await createGate(PAYGATE, contentId.trim(), priceWei, addr)
      toast.info('Confirm in your wallet...')

      // Poll receipt
      const provider = (window as any).ethereum
      for (let i = 0; i < 60; i++) {
        const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [txHash] }) as any
        if (receipt) {
          if (receipt.status === '0x0') throw new Error('Transaction reverted — gate may already exist')
          break
        }
        await new Promise(r => setTimeout(r, 1000))
      }

      setResult({ contentId: contentId.trim(), txHash })
      toast.success('Gate created!')
    } catch (err: any) {
      if (err.code === 4001) toast.error('Transaction cancelled')
      else toast.error(err.message?.slice(0, 80) || 'Failed')
    } finally {
      setCreating(false)
    }
  }

  const embedCode = result
    ? `<div data-somniagate="${PAYGATE}"\n     data-content="${result.contentId}"\n     data-price="${price}">\n  <!-- Your premium content -->\n</div>\n<script src="https://somniagate.xyz/embed.js"><\/script>`
    : null

  return (
    <section className="bg-[#F3F3F3] py-20 md:py-28">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} custom={0}>
            <SectionHeading label="Create" title="Create Your Own Gate" variant="green" />
            <p className="mt-4 max-w-2xl text-lg text-[#191A23]/60">
              Register a content gate on-chain. Set a content ID and price — that's all it takes.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={1} className="mt-12 max-w-2xl">
            {!result ? (
              <Card>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#191A23]">Content ID</label>
                    <Input
                      placeholder="e.g. my-premium-article"
                      value={contentId}
                      onChange={(e) => setContentId(e.target.value)}
                      disabled={creating}
                    />
                    <p className="text-xs text-[#191A23]/40">A unique identifier for your gated content (e.g. slug, article ID)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#191A23]">Price (STT)</label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={creating}
                    />
                    <p className="text-xs text-[#191A23]/40">You receive 95%. Minimum: any amount above 0.</p>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleCreate}
                    disabled={creating}
                  >
                    {creating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" /> Create Gate</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#B9FF66] flex items-center justify-center">
                      <Check className="w-5 h-5 text-[#191A23]" />
                    </div>
                    <div>
                      <h4 className="text-[20px] font-medium text-[#191A23]">Gate Created</h4>
                      <p className="text-sm text-[#191A23]/50">Your content gate is now live on-chain</p>
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-[#F3F3F3] border border-[#191A23]/10 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#191A23]/50">Shareable link</span>
                      <CopyBtn text={`${window.location.origin}/g/${result.contentId}`} />
                    </div>
                    <code className="block text-sm font-mono text-[#191A23] bg-white rounded-[7px] px-3 py-2 border border-[#191A23]/10">
                      {window.location.origin}/g/{result.contentId}
                    </code>
                  </div>

                  <div className="rounded-[14px] bg-[#F3F3F3] border border-[#191A23]/10 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#191A23]/50">Embed code</span>
                      <CopyBtn text={embedCode!} />
                    </div>
                    <pre className="text-xs font-mono text-[#191A23] bg-white rounded-[7px] px-3 py-2 border border-[#191A23]/10 overflow-x-auto whitespace-pre-wrap">
                      {embedCode}
                    </pre>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <a
                      href={`${EXPLORER}/tx/${result.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[#191A23]/60 hover:text-[#191A23] transition-colors"
                    >
                      View on explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => { setResult(null); setContentId(''); setPrice('') }}
                  >
                    Create Another
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ── Section 3: Widget Preview ── */

function WidgetSection() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const isDark = theme === 'dark'

  const embedCode = `<div data-somniagate="${PAYGATE}"
     data-content="my-article"
     data-price="2"
     data-theme="${theme}">
  <p>Your premium content here...</p>
</div>
<script src="https://somniagate.xyz/embed.js"><\/script>`

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} custom={0}>
            <SectionHeading label="Embed" title="Widget Preview" variant="green" />
            <p className="mt-4 max-w-2xl text-lg text-[#191A23]/60">
              Drop one script tag on any website. The widget handles wallet connection, payment, and content reveal.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={1} className="mt-12">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Code */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-[#191A23]">Embed Code</h4>
                  <CopyBtn text={embedCode} />
                </div>
                <div className="rounded-[14px] bg-[#191A23] p-5 overflow-x-auto">
                  <pre className="text-sm font-mono text-[#B9FF66] whitespace-pre-wrap">{embedCode}</pre>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#191A23]/50">Theme:</span>
                  <button
                    onClick={() => setTheme('light')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-sm transition-colors ${
                      !isDark ? 'bg-[#B9FF66] text-[#191A23]' : 'bg-[#F3F3F3] text-[#191A23]/60 hover:bg-[#e8e8e8]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-sm transition-colors ${
                      isDark ? 'bg-[#191A23] text-white' : 'bg-[#F3F3F3] text-[#191A23]/60 hover:bg-[#e8e8e8]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Dark
                  </button>
                </div>
              </div>

              {/* Preview */}
              <Card className="overflow-hidden">
                <div className={`p-6 ${isDark ? 'bg-[#191A23]' : 'bg-white'}`}>
                  {/* Fake browser chrome */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-t-[10px] ${isDark ? 'bg-[#2a2b35]' : 'bg-[#F3F3F3]'}`}>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                    <div className={`flex-1 mx-3 rounded-[5px] px-2 py-0.5 text-[9px] font-mono text-center ${
                      isDark ? 'bg-[#191A23] text-white/30' : 'bg-white text-[#191A23]/30 border border-[#191A23]/10'
                    }`}>
                      yoursite.com/premium
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`rounded-b-[10px] p-5 space-y-3 border ${isDark ? 'border-white/10 bg-[#24252f]' : 'border-[#191A23]/10'}`}>
                    {/* Fake blurred text */}
                    <div className="space-y-2 blur-[6px] select-none">
                      <div className={`h-2.5 rounded w-3/4 ${isDark ? 'bg-white/15' : 'bg-[#191A23]/10'}`} />
                      <div className={`h-2.5 rounded w-full ${isDark ? 'bg-white/15' : 'bg-[#191A23]/10'}`} />
                      <div className={`h-2.5 rounded w-5/6 ${isDark ? 'bg-white/15' : 'bg-[#191A23]/10'}`} />
                    </div>

                    {/* Widget button */}
                    <div className="flex justify-center pt-2">
                      <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium bg-gradient-to-br from-[#fe54ff] to-[#a064ff] shadow-lg shadow-purple-500/20">
                        <Lock className="w-3.5 h-3.5" />
                        Unlock for 2 STT
                      </div>
                    </div>

                    <div className={`text-center text-[9px] pt-1 ${isDark ? 'text-white/20' : 'text-[#191A23]/30'}`}>
                      Powered by SomniaGate
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ── Section 4: How It Works ── */

const flowSteps = [
  { icon: Wallet, label: 'Connect', detail: 'User connects wallet via MetaMask' },
  { icon: Zap, label: 'Pay', detail: 'Smart contract receives STT payment' },
  { icon: Sparkles, label: 'Reactivity', detail: 'Validators push confirmation in ~100ms' },
  { icon: Eye, label: 'Unlock', detail: 'Content revealed — permanent access' },
]

function HowItWorksSection() {
  return (
    <section className="bg-[#191A23] py-20 md:py-28 text-white">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} custom={0}>
            <SectionHeading label="Under the Hood" title="How It Works" variant="white" />
          </motion.div>

          <motion.div variants={fadeUp} custom={1} className="mt-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {flowSteps.map((step, i) => (
                <div key={step.label} className="relative">
                  <div className="rounded-[14px] border border-white/10 bg-white/5 p-6 h-full space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#B9FF66] flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-[#191A23]" />
                      </div>
                      <span className="text-xs font-mono text-white/30">0{i + 1}</span>
                    </div>
                    <h4 className="text-lg font-medium">{step.label}</h4>
                    <p className="text-sm text-white/50">{step.detail}</p>
                  </div>
                  {i < flowSteps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                      <ChevronRight className="w-5 h-5 text-white/20" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} custom={2} className="mt-12 rounded-[14px] border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/50">Powered by Somnia Reactivity</p>
                <p className="text-xs text-white/30 mt-1">
                  PayGate contract: <span className="font-mono">{PAYGATE.slice(0, 10)}…{PAYGATE.slice(-6)}</span>
                  {' · '}Subscription ID: 26135
                </p>
              </div>
              <Link to="/docs">
                <Button variant="tertiary" size="sm">
                  Read the Docs <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ── Page ── */

export default function Demo() {
  return (
    <div className="flex flex-col">
      <TryItSection />
      <CreateSection />
      <WidgetSection />
      <HowItWorksSection />
    </div>
  )
}
