import { LoginForm } from './LoginForm'

export const metadata = { title: 'Sign in — Wallet' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Wallet</h1>
          <p className="text-sm text-white/40 mt-1">Family financial dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-6 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
