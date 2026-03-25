import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap, ArrowRight, Shield, Globe, Clock,
  Code, CreditCard, ChevronRight,
  Wallet, Lock, Unlock, Coffee, Monitor,
  FileText, Github,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/ui/heading'

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

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/* ── Data ── */

const steps = [
  {
    step: 1,
    icon: Wallet,
    title: 'Register',
    description: 'Connect your wallet and register as a creator. One-time setup, no email or password.',
  },
  {
    step: 2,
    icon: Lock,
    title: 'Create a Gate',
    description: 'Set a content ID and price. Your gate lives on-chain — no server, no database, no downtime.',
  },
  {
    step: 3,
    icon: Code,
    title: 'Embed Anywhere',
    description: 'Copy a code snippet and drop it on your site. Content is served only after payment is verified on-chain.',
  },
]

const components = [
  {
    icon: FileText,
    title: 'Content Gate',
    description: 'Lock articles, tutorials, or premium content. Payment required to view — no blur, no dev tools bypass.',
    code: `<somniagate-content\n  gate="0xPayGate..."\n  content-id="article-1"\n  api-key="sg_your_key">\n</somniagate-content>`,
  },
  {
    icon: Coffee,
    title: 'Tip Jar',
    description: 'Drop on your portfolio, blog, or GitHub. Supporters pay STT directly to your wallet.',
    code: `<somniagate-tip\n  address="0xYour..."\n  label="Buy me a coffee"\n  amounts="1,5,10">\n</somniagate-tip>`,
  },
  {
    icon: Monitor,
    title: 'Stream Overlay',
    description: 'OBS-compatible browser source. Shows tips in real-time with animations. Powered by Reactivity events.',
    code: `https://somniagate.xyz/overlay/sg_your_key`,
  },
  {
    icon: Github,
    title: 'Donate Widget',
    description: 'Embeddable donation button for READMEs, portfolios, and profiles. Theming included.',
    code: `<somniagate-donate\n  address="0xYour..."\n  name="Your Name"\n  theme="dark">\n</somniagate-donate>`,
  },
]

const features = [
  { icon: Shield, title: 'No Blur Bypass', description: 'Content is never sent to the browser until payment is verified. Dev tools can\'t reveal it.' },
  { icon: Clock, title: 'Instant Unlock', description: 'Somnia Reactivity confirms payment in ~100ms. No waiting for block confirmations.' },
  { icon: Globe, title: 'Works Everywhere', description: 'One script tag. Static sites, WordPress, React, Next.js, OBS, GitHub — anywhere HTML works.' },
  { icon: CreditCard, title: '95% to Creator', description: '5% platform fee. No monthly subscription, no minimum payout, no payment processor middlemen.' },
]

/* ── Components ── */

function HeroMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative"
    >
      <div className="relative rounded-[45px] overflow-hidden shadow-[0_5px_0_0_#191A23] border border-[#191A23] bg-white">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F3F3F3] border-b border-[#191A23]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white rounded-[7px] border border-[#191A23]/20 px-3 py-1 text-[10px] font-mono text-[#191A23]/50 text-center">
              yourblog.com/premium-article
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-3 bg-[#191A23]/10 rounded w-3/4" />
            <div className="h-3 bg-[#191A23]/10 rounded w-full" />
            <div className="h-3 bg-[#191A23]/10 rounded w-5/6" />
          </div>

          {/* Gate overlay */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="rounded-[14px] border-2 border-dashed border-[#191A23]/30 bg-[#B9FF66]/10 p-6 text-center space-y-3"
          >
            <div className="w-10 h-10 rounded-full bg-[#B9FF66]/20 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5 text-[#191A23]" />
            </div>
            <p className="text-sm font-medium text-[#191A23]">Premium Content</p>
            <p className="text-xs text-[#191A23]/60">This article requires payment to read</p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-[14px] bg-[#191A23] text-white text-sm font-medium"
            >
              <Unlock className="w-3.5 h-3.5" />
              Unlock for 5 STT
            </motion.div>
          </motion.div>

          <div className="space-y-2 opacity-30">
            <div className="h-3 bg-[#191A23]/10 rounded w-full" />
            <div className="h-3 bg-[#191A23]/10 rounded w-2/3" />
          </div>
        </div>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
          className="px-4 py-2 border-t border-[#191A23]/20 bg-[#F3F3F3] flex items-center justify-between"
        >
          <span className="text-[10px] text-[#191A23]/50 font-mono">Powered by SomniaGate</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[9px] text-green-600 font-medium">Somnia Testnet</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ── Page ── */

export function Landing() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        <div className="container relative grid lg:grid-cols-[1fr,1.1fr] gap-16 items-center py-24 md:py-32 lg:py-36">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-7"
          >
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-[7px] bg-[#B9FF66] px-3 py-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-[#191A23]" />
              <span className="text-sm text-[#191A23] font-medium">Powered by Somnia Reactivity</span>
            </motion.div>

            <h1 className="text-[60px] leading-[1.1] font-medium text-[#191A23]">
              Get Paid for Your{' '}
              <br className="hidden sm:block" />
              Content.{' '}
              <span className="bg-[#B9FF66] rounded-[7px] px-[7px]">Instantly.</span>
            </h1>

            <p className="text-lg text-[#191A23]/70 max-w-lg leading-relaxed">
              Universal payment gate for the web. Lock content, accept tips,
              monetize streams — one line of code, instant on-chain settlement.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button variant="primary" size="lg" asChild>
                <Link to="/dashboard">
                  Start Building
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <Link to="/docs">Read Docs</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3">
              {[
                { icon: Clock, text: '~100ms unlock' },
                { icon: Shield, text: 'Tamper-proof' },
                { icon: CreditCard, text: '95% to creator' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-sm text-[#191A23]/60">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="hidden lg:block">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative overflow-hidden bg-white">
        <div className="container relative py-24 md:py-28">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <SectionHeading label="How It Works" title="Three steps to monetize anything" />
            </motion.div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                custom={i} variants={fadeUp}
                className="relative group"
              >
                <div className="rounded-[45px] border border-[#191A23] bg-[#F3F3F3] p-7 h-full shadow-[0_5px_0_0_#191A23]">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-[#191A23] flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-[#191A23] flex items-center justify-center">
                      <span className="text-sm font-semibold text-[#191A23]">{s.step}</span>
                    </div>
                  </div>
                  <h3 className="text-[20px] font-medium text-[#191A23] mb-2">{s.title}</h3>
                  <p className="text-base text-[#191A23]/70 leading-relaxed">{s.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="w-5 h-5 text-[#191A23]/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Components ── */}
      <section className="bg-[#191A23]">
        <div className="container py-24 md:py-28">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <SectionHeading
                label="Components"
                title="Drop-in widgets for every platform"
                variant="white"
              />
            </motion.div>
            <motion.p variants={fadeUp} custom={1} className="text-base text-white/60 max-w-lg mt-4">
              Copy, paste, get paid. Each component works with a single script tag.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
            className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto"
          >
            {components.map((c) => (
              <motion.div
                key={c.title}
                variants={scaleIn}
                className="rounded-[45px] border border-white/20 bg-white/5 p-8 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#B9FF66] flex items-center justify-center">
                    <c.icon className="w-5 h-5 text-[#191A23]" />
                  </div>
                  <h3 className="text-[20px] font-medium text-white">{c.title}</h3>
                </div>
                <p className="text-base text-white/60 leading-relaxed">{c.description}</p>
                <div className="rounded-[14px] bg-[#191A23] border border-white/10 p-4 font-mono text-sm leading-relaxed">
                  <pre className="text-[#B9FF66] whitespace-pre-wrap">{c.code}</pre>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Why SomniaGate ── */}
      <section className="bg-white">
        <div className="container py-24 md:py-28">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <SectionHeading label="Why SomniaGate" title="Not another payment processor" />
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={scaleIn}
                className="rounded-[45px] border border-[#191A23] bg-white p-6 shadow-[0_5px_0_0_#191A23]"
              >
                <div className="w-10 h-10 rounded-full bg-[#B9FF66] flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#191A23]" />
                </div>
                <h3 className="text-[20px] font-medium text-[#191A23] mb-2">{f.title}</h3>
                <p className="text-base text-[#191A23]/70 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="bg-[#F3F3F3]">
        <div className="container py-24 md:py-28">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-12">
              <SectionHeading label="Comparison" title="SomniaGate vs Traditional" />
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="rounded-[45px] border border-[#191A23] bg-white overflow-hidden shadow-[0_5px_0_0_#191A23]">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-[#191A23]">
                    <th className="text-left p-4 font-medium text-[#191A23]">Feature</th>
                    <th className="text-center p-4 font-medium"><span className="bg-[#B9FF66] rounded-[7px] px-2 py-1">SomniaGate</span></th>
                    <th className="text-center p-4 font-medium text-[#191A23]/50">Stripe / Patreon</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Settlement time', '~100ms', '2-7 days'],
                    ['Creator cut', '95%', '70-85%'],
                    ['Requires account', 'No (wallet only)', 'Yes (email, bank, tax)'],
                    ['Minimum payout', 'None', '$10-100'],
                    ['Geographic limits', 'None', 'Country restrictions'],
                    ['Censorship risk', 'None (on-chain)', 'Platform can ban you'],
                    ['Infrastructure', 'Zero (on-chain)', 'Server required'],
                  ].map(([feature, sg, trad], i) => (
                    <tr key={i} className="border-b border-[#191A23]/10 last:border-0">
                      <td className="p-4 font-medium text-[#191A23]">{feature}</td>
                      <td className="p-4 text-center text-[#191A23] font-medium">{sg}</td>
                      <td className="p-4 text-center text-[#191A23]/40">{trad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white">
        <div className="container py-24 md:py-28">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true }}
            className="relative rounded-[45px] overflow-hidden bg-[#191A23] p-14 md:p-16 text-center"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-[40px] leading-[1.2] font-medium text-white mb-4">
              Ready to get <span className="bg-[#B9FF66] text-[#191A23] rounded-[7px] px-[7px]">paid</span>?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-white/60 mb-8 max-w-lg mx-auto">
              Register in 30 seconds. Start accepting payments in under a minute.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="flex justify-center gap-3">
              <Button variant="tertiary" size="lg" asChild>
                <Link to="/dashboard">Create Your First Gate</Link>
              </Button>
              <Button variant="secondary" size="lg" className="border-white text-white hover:bg-white/10" asChild>
                <Link to="/docs">View Docs</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#191A23] bg-[#191A23]">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#B9FF66]" />
            <span className="text-base text-white/60">
              SomniaGate — Built on Somnia Reactivity
            </span>
          </div>
          <div className="flex gap-6 text-sm text-white/40">
            <Link to="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <a href="https://docs.somnia.network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Somnia Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
