import { useState } from 'react'
import {
  LayoutGrid, Key, Code, History, Plus,
  Copy, Check, Wallet,
  Lock, Coffee, Monitor, Github,
  FileText, Settings,
  TrendingUp, DollarSign, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'

/* ── Types ── */

const NAV_ITEMS = [
  { id: 'gates', icon: LayoutGrid, label: 'My Gates' },
  { id: 'components', icon: Code, label: 'Components' },
  { id: 'history', icon: History, label: 'History' },
  { id: 'settings', icon: Settings, label: 'Settings' },
] as const

type TabId = (typeof NAV_ITEMS)[number]['id']

/* ── Copy helper ── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-[7px] hover:bg-[#F3F3F3] transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-[#191A23]/40" />}
    </button>
  )
}

/* ── Registration Screen ── */

function RegisterScreen() {
  const { connect, isConnected, register } = useAuthStore()
  const [registering, setRegistering] = useState(false)

  const handleRegister = async () => {
    setRegistering(true)
    try {
      if (!isConnected) await connect()
      await register()
      toast.success('Registered! Your API key is ready.')
    } catch (e) {
      toast.error((e as Error).message)
    }
    setRegistering(false)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#B9FF66] flex items-center justify-center mx-auto">
          <Key className="w-7 h-7 text-[#191A23]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Register as Creator</h1>
          <p className="text-base text-[#191A23]/60">
            Connect your wallet to get an API key. Use it to create payment gates
            and embed components on your site.
          </p>
        </div>
        <div className="rounded-[14px] border border-[#191A23] bg-white p-5 space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#B9FF66] flex items-center justify-center text-sm font-semibold text-[#191A23]">1</div>
            <span className="text-base text-[#191A23]">Connect your Somnia wallet</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#B9FF66] flex items-center justify-center text-sm font-semibold text-[#191A23]">2</div>
            <span className="text-base text-[#191A23]">Sign a message to verify ownership</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#B9FF66] flex items-center justify-center text-sm font-semibold text-[#191A23]">3</div>
            <span className="text-base text-[#191A23]">Get your API key — start embedding</span>
          </div>
        </div>
        <p className="text-sm text-[#191A23]/40">
          5% platform fee on all payments. 95% goes directly to your wallet.
        </p>
        <Button variant="primary" size="lg" onClick={handleRegister} disabled={registering}>
          <Wallet className="h-4 w-4 mr-2" />
          {registering ? 'Registering...' : isConnected ? 'Complete Registration' : 'Connect Wallet & Register'}
        </Button>
      </div>
    </div>
  )
}

/* ── Stats Bar ── */

function StatsBar() {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {[
        { icon: DollarSign, label: 'Total Revenue', value: '0 STT' },
        { icon: Users, label: 'Total Unlocks', value: '0' },
        { icon: LayoutGrid, label: 'Active Gates', value: '0' },
        { icon: TrendingUp, label: 'This Week', value: '0 STT' },
      ].map((s) => (
        <div key={s.label} className="rounded-[14px] border border-[#191A23] bg-white p-4 shadow-[0_3px_0_0_#191A23]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#B9FF66] flex items-center justify-center">
              <s.icon className="w-4 h-4 text-[#191A23]" />
            </div>
            <span className="text-sm text-[#191A23]/60">{s.label}</span>
          </div>
          <span className="text-[20px] font-medium text-[#191A23]">{s.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Gates Tab ── */

function GatesTab() {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">My Gates</h2>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Gate
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-[14px] border border-[#191A23] bg-white p-5 space-y-4">
          <h3 className="text-[20px] font-medium text-[#191A23]">New Gate</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-base font-medium text-[#191A23]">Content ID</label>
              <input
                type="text"
                placeholder="premium-article-001"
                className="w-full rounded-[14px] border border-[#191A23] bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#B9FF66] focus:border-[#B9FF66] transition-colors"
              />
              <p className="text-sm text-[#191A23]/40">Unique identifier for this content</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-base font-medium text-[#191A23]">Price (STT)</label>
              <input
                type="number"
                placeholder="5"
                className="w-full rounded-[14px] border border-[#191A23] bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#B9FF66] focus:border-[#B9FF66] transition-colors"
              />
              <p className="text-sm text-[#191A23]/40">Price in STT (95% goes to you)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm">Create Gate</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      <div className="rounded-[14px] border border-[#191A23] bg-white p-12 text-center">
        <Lock className="w-8 h-8 text-[#191A23]/30 mx-auto mb-3" />
        <p className="text-base text-[#191A23]/70 mb-1">No gates yet</p>
        <p className="text-sm text-[#191A23]/40">Create your first gate to start monetizing content</p>
      </div>
    </div>
  )
}

/* ── Components Tab ── */

function ComponentsTab() {
  const apiKey = useAuthStore((s) => s.apiKey) || 'sg_your_api_key'
  const address = useAuthStore((s) => s.address) || '0xYourAddress...'

  const snippets = [
    {
      icon: FileText,
      title: 'Content Gate',
      description: 'Lock articles, tutorials, or premium pages. Content is never sent to the browser until payment is verified.',
      code: `<!-- SomniaGate Content Lock -->
<somniagate-content
  gate="0xPayGateAddress"
  content-id="your-content-id"
  api-key="${apiKey}">
  <!-- Your premium content here -->
  <h2>Premium Article</h2>
  <p>This content is only visible after payment...</p>
</somniagate-content>
<script src="https://somniagate.xyz/sdk.js"></script>`,
    },
    {
      icon: Coffee,
      title: 'Tip Jar / Buy Me a Coffee',
      description: 'Drop on your portfolio, blog, or GitHub profile. Supporters send STT directly to your wallet.',
      code: `<!-- SomniaGate Tip Jar -->
<somniagate-tip
  address="${address}"
  label="Buy me a coffee"
  amounts="1,5,10"
  theme="dark">
</somniagate-tip>
<script src="https://somniagate.xyz/sdk.js"></script>`,
    },
    {
      icon: Monitor,
      title: 'Stream Overlay',
      description: 'Add as OBS browser source. Shows real-time tip alerts powered by Somnia Reactivity events.',
      code: `<!-- OBS Browser Source URL -->
https://somniagate.xyz/overlay/${apiKey}

<!-- Customize with query params -->
?color=ff54ff&duration=5000&position=top-right`,
    },
    {
      icon: Github,
      title: 'Donate Widget',
      description: 'Compact donation button for GitHub READMEs, portfolio sites, and social profiles.',
      code: `<!-- SomniaGate Donate Button -->
<somniagate-donate
  address="${address}"
  name="Your Name"
  theme="dark">
</somniagate-donate>
<script src="https://somniagate.xyz/sdk.js"></script>`,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Components</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#191A23]/60">API Key:</span>
          <code className="font-mono bg-[#B9FF66] rounded-[7px] px-2 py-0.5 text-[#191A23]">{apiKey}</code>
          <CopyButton text={apiKey} />
        </div>
      </div>

      <div className="grid gap-4">
        {snippets.map((s) => (
          <div key={s.title} className="rounded-[14px] border border-[#191A23] bg-white p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#B9FF66] flex items-center justify-center">
                <s.icon className="w-4 h-4 text-[#191A23]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[20px] font-medium text-[#191A23]">{s.title}</h3>
                <p className="text-sm text-[#191A23]/50">{s.description}</p>
              </div>
              <CopyButton text={s.code} />
            </div>
            <div className="rounded-[14px] bg-[#F3F3F3] border border-[#191A23]/10 p-4 font-mono text-sm leading-relaxed">
              <pre className="text-[#191A23]/70 whitespace-pre-wrap">{s.code}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── History Tab ── */

function HistoryTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Payment History</h2>

      <div className="rounded-[14px] border border-[#191A23] bg-white overflow-hidden">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-[#191A23]">
              <th className="text-left p-3 font-medium text-[#191A23]">Content</th>
              <th className="text-left p-3 font-medium text-[#191A23]">User</th>
              <th className="text-right p-3 font-medium text-[#191A23]">Amount</th>
              <th className="text-right p-3 font-medium text-[#191A23]">Time</th>
              <th className="text-right p-3 font-medium text-[#191A23]">Tx</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="p-8 text-center text-[#191A23]/50">
                <History className="w-6 h-6 mx-auto mb-2 text-[#191A23]/30" />
                No payments yet. Create a gate and share it to start receiving payments.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Settings Tab ── */

function SettingsTab() {
  const { address, apiKey } = useAuthStore()

  return (
    <div className="space-y-6">
      <h2 className="text-[30px] leading-[1.3] font-medium text-[#191A23]">Settings</h2>

      <div className="rounded-[14px] border border-[#191A23] bg-white p-5 space-y-4">
        <h3 className="text-[20px] font-medium text-[#191A23]">Account</h3>
        <div className="grid gap-3">
          <div className="flex items-center justify-between py-2 border-b border-[#191A23]/10">
            <span className="text-base text-[#191A23]/60">Wallet</span>
            <div className="flex items-center gap-2">
              <code className="font-mono text-base text-[#191A23]">{address || 'Not connected'}</code>
              {address && <CopyButton text={address} />}
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#191A23]/10">
            <span className="text-base text-[#191A23]/60">API Key</span>
            <div className="flex items-center gap-2">
              <code className="font-mono text-base bg-[#B9FF66] rounded-[7px] px-2 py-0.5 text-[#191A23]">{apiKey || 'Not registered'}</code>
              {apiKey && <CopyButton text={apiKey} />}
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-base text-[#191A23]/60">Platform Fee</span>
            <span className="text-base font-medium text-[#191A23]">5%</span>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#191A23] bg-white p-5 space-y-4">
        <h3 className="text-[20px] font-medium text-[#191A23]">Revenue</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base text-[#191A23]/60">Withdrawable Balance</p>
            <p className="text-[30px] leading-[1.3] font-medium text-[#191A23]">0 STT</p>
          </div>
          <Button variant="secondary" size="sm">
            Withdraw
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Dashboard ── */

export function Dashboard() {
  const { isRegistered } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('gates')

  if (!isRegistered) {
    return <RegisterScreen />
  }

  const tabContent: Record<TabId, React.ReactNode> = {
    gates: <GatesTab />,
    components: <ComponentsTab />,
    history: <HistoryTab />,
    settings: <SettingsTab />,
  }

  return (
    <div className="flex flex-1 h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-56 border-r border-[#191A23] bg-[#F3F3F3] flex-shrink-0 p-4 space-y-1">
        <div className="px-3 py-2 mb-4">
          <span className="bg-[#B9FF66] rounded-[7px] px-[7px] py-[5px] text-sm font-medium text-[#191A23]">DASHBOARD</span>
        </div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-base transition-colors ${
              activeTab === item.id
                ? 'bg-[#191A23] text-white font-medium'
                : 'text-[#191A23] hover:bg-white'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        <StatsBar />
        {tabContent[activeTab]}
      </div>
    </div>
  )
}
