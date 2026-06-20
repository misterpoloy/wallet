import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Wallet — Family Financial Dashboard',
  description: 'Multi-tenant family wallet: credit cards, bank accounts & recurring expenses',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-[#070a0f] text-white min-h-screen antialiased`}>
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-60 -left-40 w-[700px] h-[700px] rounded-full bg-amber-500/[0.04] blur-[160px]" />
          <div className="absolute top-1/3 -right-60 w-[600px] h-[600px] rounded-full bg-white/[0.015] blur-[140px]" />
          <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full bg-amber-400/[0.03] blur-[130px]" />
        </div>
        {children}
      </body>
    </html>
  )
}
