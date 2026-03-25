import { useState, useEffect, useRef } from 'react'
import { Zap, Code, Lock, CreditCard, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/ui/heading'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'content-gate', label: 'Content Gate' },
  { id: 'tip-jar', label: 'Tip Jar' },
  { id: 'stream-overlay', label: 'Stream Overlay' },
  { id: 'donate-widget', label: 'Donate Widget' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'api', label: 'API Reference' },
]

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="rounded-[14px] bg-[#F3F3F3] border border-[#191A23]/10 p-4 font-mono text-sm leading-relaxed overflow-x-auto">
      <pre className="text-[#191A23]/70">{code}</pre>
    </div>
  )
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState('overview')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <div className="container py-8 flex gap-8">
      {/* Sidebar */}
      <nav className="hidden lg:block w-48 flex-shrink-0">
        <div className="sticky top-24 space-y-1">
          <span className="inline-block bg-[#B9FF66] rounded-[7px] px-[7px] py-[5px] text-sm font-medium text-[#191A23] mb-3">DOCUMENTATION</span>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`block px-3 py-1.5 rounded-[14px] text-base transition-colors ${
                activeSection === s.id
                  ? 'bg-[#191A23] text-white font-medium'
                  : 'text-[#191A23]/70 hover:text-[#191A23] hover:bg-[#F3F3F3]'
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 max-w-3xl space-y-12">
        <section id="overview" className="space-y-4">
          <SectionHeading label="Overview" title="SomniaGate Documentation" />
          <p className="text-lg text-[#191A23]/70 leading-relaxed">
            SomniaGate is a universal payment gate built on Somnia's Reactivity protocol.
            Embed payment widgets on any website — articles, streams, portfolios, GitHub — and
            receive instant on-chain payments with ~100ms settlement.
          </p>
          <div className="rounded-[14px] border border-[#191A23] bg-white p-5 space-y-3">
            <h3 className="text-[20px] font-medium text-[#191A23]">Key Features</h3>
            <ul className="space-y-2 text-base text-[#191A23]/70">
              <li className="flex items-start gap-2"><Lock className="w-4 h-4 text-[#191A23] mt-1 shrink-0" /> Content is never sent to the browser until payment is verified on-chain — cannot be bypassed via dev tools</li>
              <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-[#191A23] mt-1 shrink-0" /> Reactivity confirms payment in ~100ms — no waiting for block confirmations</li>
              <li className="flex items-start gap-2"><CreditCard className="w-4 h-4 text-[#191A23] mt-1 shrink-0" /> 95% goes directly to the creator, 5% platform fee</li>
              <li className="flex items-start gap-2"><Code className="w-4 h-4 text-[#191A23] mt-1 shrink-0" /> Single script tag — works on any site that supports HTML</li>
            </ul>
          </div>
        </section>

        <section id="quickstart" className="space-y-4">
          <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Quick Start</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#B9FF66] flex items-center justify-center text-sm font-bold text-[#191A23] shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-base font-medium text-[#191A23]">Register as a creator</p>
                <p className="text-base text-[#191A23]/60">Go to the <Link to="/dashboard" className="text-[#191A23] underline hover:no-underline">Dashboard</Link>, connect your wallet, and sign to register. You'll get an API key.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#B9FF66] flex items-center justify-center text-sm font-bold text-[#191A23] shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-base font-medium text-[#191A23]">Create a gate</p>
                <p className="text-base text-[#191A23]/60">In the Dashboard, click "Create Gate". Set a content ID and price in STT.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#B9FF66] flex items-center justify-center text-sm font-bold text-[#191A23] shrink-0 mt-0.5">3</div>
              <div>
                <p className="text-base font-medium text-[#191A23]">Embed the widget</p>
                <p className="text-base text-[#191A23]/60">Copy a code snippet from the Components tab and paste it into your site.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="content-gate" className="space-y-4">
          <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Content Gate</h2>
          <p className="text-base text-[#191A23]/60">
            Lock articles, tutorials, or premium content behind a payment. The content is
            fetched from the server only after the user's payment is verified on-chain.
          </p>
          <CodeBlock code={`<somniagate-content
  gate="0xPayGateAddress"
  content-id="premium-article-001"
  api-key="sg_your_api_key">
  <!-- Content loaded server-side after payment -->
</somniagate-content>
<script src="https://somniagate.xyz/sdk.js"></script>`} />
          <div className="rounded-[14px] border border-[#191A23] bg-white p-4 space-y-2">
            <h4 className="text-[20px] font-medium text-[#191A23]">Attributes</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-[#191A23]/10"><td className="py-1.5 font-mono text-[#191A23]">gate</td><td className="py-1.5 text-[#191A23]/60">PayGate contract address</td></tr>
                <tr className="border-b border-[#191A23]/10"><td className="py-1.5 font-mono text-[#191A23]">content-id</td><td className="py-1.5 text-[#191A23]/60">Unique content identifier (matches your gate)</td></tr>
                <tr><td className="py-1.5 font-mono text-[#191A23]">api-key</td><td className="py-1.5 text-[#191A23]/60">Your API key from the dashboard</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="tip-jar" className="space-y-4">
          <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Tip Jar</h2>
          <p className="text-base text-[#191A23]/60">
            A "Buy me a coffee" widget for crypto. Drop it on your blog, portfolio, or
            GitHub profile. Supporters pick an amount and pay with STT.
          </p>
          <CodeBlock code={`<somniagate-tip
  address="0xYourWallet"
  label="Buy me a coffee"
  amounts="1,5,10"
  theme="dark">
</somniagate-tip>
<script src="https://somniagate.xyz/sdk.js"></script>`} />
        </section>

        <section id="stream-overlay" className="space-y-4">
          <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Stream Overlay</h2>
          <p className="text-base text-[#191A23]/60">
            Add as an OBS Browser Source. Shows real-time tip alerts powered by Somnia
            Reactivity — tips appear on screen within ~100ms of payment.
          </p>
          <CodeBlock code={`OBS Browser Source URL:
https://somniagate.xyz/overlay/sg_your_api_key

Customize:
?color=ff54ff        — accent color
&duration=5000       — alert display time (ms)
&position=top-right  — alert position
&sound=true          — play sound on tip`} />
        </section>

        <section id="donate-widget" className="space-y-4">
          <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Donate Widget</h2>
          <p className="text-base text-[#191A23]/60">
            Compact donation button for GitHub READMEs, portfolios, and social profiles.
          </p>
          <CodeBlock code={`<somniagate-donate
  address="0xYourWallet"
  name="Your Name"
  theme="dark">
</somniagate-donate>
<script src="https://somniagate.xyz/sdk.js"></script>`} />
        </section>

        <section id="how-it-works" className="space-y-4">
          <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">How It Works</h2>
          <p className="text-base text-[#191A23]/60">
            SomniaGate uses Somnia's Reactivity protocol for instant payment verification.
          </p>
          <CodeBlock code={`1. User clicks "Unlock for 5 STT"
2. MetaMask popup → user signs transaction
3. STT is sent to the PayGate contract
4. PayGate emits AccessGranted event
5. Reactivity handler fires (~100ms):
   → 95% forwarded to creator's wallet
   → 5% to platform
   → Emits PaymentConfirmed event
6. Widget detects confirmation → content loads

Total time from click to content: ~1 second
No backend polling. No webhooks. No "waiting for confirmations."`} />
          <p className="text-base text-[#191A23]/60">
            The key difference from traditional payment processors: <strong className="text-[#191A23]">content is never
            sent to the browser until payment is verified on-chain</strong>. The widget shows
            a placeholder, and only fetches the real content after the PayGate contract confirms access.
            This cannot be bypassed via browser dev tools.
          </p>
        </section>

        <section id="pricing" className="space-y-4">
          <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Pricing</h2>
          <div className="rounded-[14px] border border-[#191A23] bg-white overflow-hidden">
            <table className="w-full text-base">
              <tbody>
                <tr className="border-b border-[#191A23]/10"><td className="p-3 font-medium text-[#191A23]">Platform fee</td><td className="p-3 text-[#191A23]/70">5% per payment</td></tr>
                <tr className="border-b border-[#191A23]/10"><td className="p-3 font-medium text-[#191A23]">Creator receives</td><td className="p-3 text-[#191A23]/70">95% per payment</td></tr>
                <tr className="border-b border-[#191A23]/10"><td className="p-3 font-medium text-[#191A23]">Registration</td><td className="p-3 text-[#191A23]/70">Free (wallet signature only)</td></tr>
                <tr className="border-b border-[#191A23]/10"><td className="p-3 font-medium text-[#191A23]">Monthly fee</td><td className="p-3 text-[#191A23]/70">None</td></tr>
                <tr className="border-b border-[#191A23]/10"><td className="p-3 font-medium text-[#191A23]">Minimum payout</td><td className="p-3 text-[#191A23]/70">None — withdraw anytime</td></tr>
                <tr><td className="p-3 font-medium text-[#191A23]">Gas costs</td><td className="p-3 text-[#191A23]/70">~0.001-0.005 STT per unlock (paid by user)</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="api" className="space-y-4">
          <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">API Reference</h2>
          <p className="text-base text-[#191A23]/60">
            SomniaGate is fully on-chain. All interactions go through the PayGate smart contract.
          </p>
          <div className="space-y-3">
            {[
              { name: 'createGate(contentId, price)', desc: 'Register a new payment gate. Called by the creator.' },
              { name: 'unlock(contentId)', desc: 'Pay to unlock content. Called by the user with value = price.' },
              { name: 'checkAccess(contentId, user)', desc: 'Check if a user has unlocked content. View function, no gas.' },
              { name: 'getGate(contentId)', desc: 'Get gate details: creator, price, active, revenue, unlock count.' },
              { name: 'withdraw()', desc: 'Creator withdraws accumulated revenue. Sends full balance.' },
              { name: 'updateGate(contentId, price, active)', desc: 'Update gate price or deactivate. Creator only.' },
            ].map((fn) => (
              <div key={fn.name} className="rounded-[14px] border border-[#191A23] bg-white p-4">
                <code className="text-base font-mono text-[#191A23]">{fn.name}</code>
                <p className="text-sm text-[#191A23]/60 mt-1">{fn.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-8 border-t border-[#191A23]">
          <Button variant="primary" asChild>
            <Link to="/dashboard">
              Go to Dashboard
              <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
