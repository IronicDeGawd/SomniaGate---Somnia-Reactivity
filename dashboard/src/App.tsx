import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Navbar } from '@/components/Navbar'
import { Landing } from '@/pages/Landing'
import { Dashboard } from '@/pages/Dashboard'
import GatePage from '@/pages/GatePage'
import Docs from '@/pages/Docs'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/g/:id" element={<GatePage />} />
            <Route path="/docs" element={<Docs />} />
          </Routes>
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </BrowserRouter>
  )
}
