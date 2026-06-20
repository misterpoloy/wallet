import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { NavigationLoader } from '@/components/ui/NavigationLoader'
import { TimezoneProvider } from '@/components/providers/TimezoneProvider'
import { GlobalLoaderProvider } from '@/components/ui/GlobalLoader'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLoaderProvider>
      <TimezoneProvider>
        <Suspense>
          <NavigationLoader />
        </Suspense>
        <TopBar />
        <div className="flex min-h-screen pt-11">
          <Sidebar />
          <main className="flex-1 ml-[220px] min-h-screen relative z-10">
            <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">{children}</div>
          </main>
        </div>
      </TimezoneProvider>
    </GlobalLoaderProvider>
  )
}
