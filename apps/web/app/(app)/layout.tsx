import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { NavProvider } from '@/components/layout/NavProvider'
import { NavigationLoader } from '@/components/ui/NavigationLoader'
import { TimezoneProvider } from '@/components/providers/TimezoneProvider'
import { GlobalLoaderProvider } from '@/components/ui/GlobalLoader'
import { prisma } from '@wallet/db'
import { getServerCtx } from '@/lib/auth/ctx'
import type { ShellUser } from '@/components/layout/types'
import { MansaProvider } from '@/components/mansa/MansaProvider'
import { mansaEnabled } from '@/lib/mansa/flags'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getServerCtx()
  const row = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true, avatarColor: true },
  })
  const user: ShellUser = row ?? { name: ctx.email, email: ctx.email, avatarColor: '#7c3aed' }

  const mansa = mansaEnabled() && ctx.role !== 'viewer'

  return (
    <GlobalLoaderProvider>
      <MansaProvider enabled={mansa}>
        <TimezoneProvider>
          <Suspense>
            <NavigationLoader />
          </Suspense>
          <NavProvider>
            <TopBar user={user} />
            <div className="flex min-h-screen pt-11">
              <Sidebar user={user} />
              <main className="flex-1 min-w-0 md:ml-[220px] min-h-screen relative z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">{children}</div>
              </main>
            </div>
          </NavProvider>
        </TimezoneProvider>
      </MansaProvider>
    </GlobalLoaderProvider>
  )
}
