import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { NavigationLoader } from '@/components/ui/NavigationLoader'
import { TimezoneProvider } from '@/components/providers/TimezoneProvider'
import { GlobalLoaderProvider } from '@/components/ui/GlobalLoader'
import { prisma } from '@wallet/db'
import { getServerCtx } from '@/lib/auth/ctx'
import type { ShellUser } from '@/components/layout/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getServerCtx()
  const row = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true, avatarColor: true },
  })
  const user: ShellUser = row ?? { name: ctx.email, email: ctx.email, avatarColor: '#7c3aed' }

  return (
    <GlobalLoaderProvider>
      <TimezoneProvider>
        <Suspense>
          <NavigationLoader />
        </Suspense>
        <TopBar user={user} />
        <div className="flex min-h-screen pt-11">
          <Sidebar user={user} />
          <main className="flex-1 ml-[220px] min-h-screen relative z-10">
            <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">{children}</div>
          </main>
        </div>
      </TimezoneProvider>
    </GlobalLoaderProvider>
  )
}
