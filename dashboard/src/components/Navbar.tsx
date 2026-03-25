import { Zap, Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Demo', href: '/demo' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Docs', href: '/docs' },
]

export function Navbar() {
  const location = useLocation()
  const { address, isConnected, connect, disconnect } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#191A23] bg-white">
      <div className="container flex h-16 items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 font-medium text-[#191A23]">
          <Zap className="h-5 w-5 text-[#191A23]" strokeWidth={2.5} />
          <span className="text-[20px] font-medium">SomniaGate</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'px-4 py-2 rounded-[14px] text-base font-medium transition-colors',
                location.pathname.startsWith(link.href)
                  ? 'bg-[#B9FF66] text-[#191A23]'
                  : 'text-[#191A23] hover:bg-[#F3F3F3]'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={disconnect}
              className="hidden md:inline-flex font-mono text-xs"
            >
              {shortAddress}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => connect().catch(console.error)}
              className="hidden md:inline-flex"
            >
              Connect Wallet
            </Button>
          )}

          <button
            className="md:hidden p-2 rounded-[14px] text-[#191A23] hover:bg-[#F3F3F3] transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#191A23] bg-white px-4 pb-4 pt-2 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'px-4 py-2.5 rounded-[14px] text-base font-medium transition-colors',
                location.pathname.startsWith(link.href)
                  ? 'bg-[#B9FF66] text-[#191A23]'
                  : 'text-[#191A23] hover:bg-[#F3F3F3]'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2">
            {isConnected ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { disconnect(); setMobileOpen(false) }}
                className="w-full font-mono text-xs"
              >
                {shortAddress}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => { connect().catch(console.error); setMobileOpen(false) }}
                className="w-full"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
