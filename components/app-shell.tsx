'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CreditCard,
  Home,
  Settings,
  UserCircle,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrowserOnline, useOnline, useStore } from '@/lib/store'
import { activeProfile } from '@/lib/profile'
import { OfflineNotice } from '@/components/offline-notice'
import { AutoSync } from '@/components/auto-sync'
import { ModeSwitcher } from '@/components/mode-switcher'
import { ContactUpdates } from '@/components/contact-updates'
import { OnboardingTour } from '@/components/onboarding/tour'

const NAV = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/card', label: 'My card', icon: CreditCard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const MOBILE_NAV = NAV.filter((n) => n.href !== '/agents' && n.href !== '/account')

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const online = useOnline()
  const browserOnline = useBrowserOnline()
  const { state, update, log } = useStore()
  const { manualOffline, autoOffline } = state.settings
  const lostConnection = !browserOnline && autoOffline && !manualOffline

  function toggleOffline() {
    const next = !manualOffline
    update((s) => ({ ...s, settings: { ...s.settings, manualOffline: next } }))
    log(6, next ? 'Offline mode on. Capturing and storing on this device.' : 'Back online. Queued cards are ready to enrich.')
  }
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <div className="min-h-dvh md:flex">
      <OfflineNotice />
      <AutoSync />
      <OnboardingTour />
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={32} height={32} className="size-8" />
          <span className="font-semibold tracking-tight">RenKin</span>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
                isActive(href) && 'bg-sidebar-accent font-medium text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{activeProfile(state).name}</p>
          <p>{activeProfile(state).headline}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/85 px-3 backdrop-blur md:h-32 md:gap-3 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={32} height={32} className="size-8" />
            <span className="sr-only">RenKin</span>
          </div>
          <div data-tour="modes">
            <ModeSwitcher className="[&_button]:px-2.5 [&_button]:py-1.5 [&_button]:text-xs [&_svg]:size-3.5 md:[&_button]:px-3.5 md:[&_button]:py-2 md:[&_button]:text-sm md:[&_svg]:size-4" />
          </div>
          {/* Header ribbon */}
          <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
            <ContactUpdates />
            {/* Online / Offline pill */}
            <button
              type="button"
              onClick={toggleOffline}
              data-tour="offline"
              disabled={lostConnection}
              aria-pressed={!online}
              aria-label={
                lostConnection
                  ? 'Offline: no connection'
                  : online
                    ? 'Online. Tap to go offline'
                    : 'Offline. Tap to go back online'
              }
              title={lostConnection ? 'No connection. Reconnects automatically.' : online ? 'Tap to go offline' : 'Tap to go back online'}
              className={cn(
                'flex size-9 shrink-0 items-center justify-center gap-3 rounded-full border text-base transition-colors disabled:cursor-not-allowed md:size-auto md:px-6 md:py-2.5',
                online
                  ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400',
              )}
            >
              {online ? <Wifi className="size-5 md:size-[1.75rem]" aria-hidden /> : <WifiOff className="size-5 md:size-[1.75rem]" aria-hidden />}
              <span className="hidden sm:inline">{online ? 'Online' : 'Offline · saving locally'}</span>
            </button>
            {/* Account & sync button — 3× original (36px → 108px) */}
            <Link
              href="/account"
              aria-label="Account and sync"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-muted-foreground hover:bg-accent hover:text-foreground md:size-[6.75rem]"
            >
              {state.settings.companion.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- small inline data URL
                <img
                  src={state.settings.companion.photo}
                  alt=""
                  className="size-8 rounded-full border object-cover md:size-[4.5rem]"
                />
              ) : (
                <UserCircle className="size-7 md:size-[3.75rem]" aria-hidden />
              )}
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-12">{children}</main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground',
              isActive(href) && 'text-primary',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
