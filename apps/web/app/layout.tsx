import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { NavigationLoader } from '@/components/ui/NavigationLoader'
import { TimezoneProvider } from '@/components/providers/TimezoneProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Wallet — Family Financial Dashboard',
  description: 'Multi-tenant family wallet: credit cards, bank accounts & recurring expenses',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-[#030312] text-white min-h-screen antialiased`}>
        {/* Background depth orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-60 -left-40 w-[700px] h-[700px] rounded-full bg-violet-700/10 blur-[140px]" />
          <div className="absolute top-1/3 -right-60 w-[600px] h-[600px] rounded-full bg-cyan-600/8 blur-[140px]" />
          <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full bg-pink-600/7 blur-[120px]" />
        </div>

        <Suspense>
          <NavigationLoader />
        </Suspense>

        <TimezoneProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-[240px] min-h-screen relative z-10">
              <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">{children}</div>
            </main>
          </div>
        </TimezoneProvider>
      </body>
    </html>
  )
}

