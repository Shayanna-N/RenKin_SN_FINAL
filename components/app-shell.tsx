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
import { useOnline, useStore } from '@/lib/store'
import { activeProfile } from '@/lib/profile'
import { ModeSwitcher } from '@/components/mode-switcher'
import { ContactUpdates } from '@/components/contact-updates'

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
  const { state } = useStore()
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">R</span>
          </span>
          <span className="font-semibold tracking-tight">Renkin</span>
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
        <header className="sticky top-0 z-30 flex h-32 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">R</span>
            </span>
            <span className="sr-only">Renkin</span>
          </div>
          <ModeSwitcher className="[&_button]:px-3.5 [&_button]:py-2 [&_button]:text-sm [&_svg]:size-4" />
          {/* Header ribbon */}
          <div className="flex items-center gap-3">
            <ContactUpdates />
            {/* Online / Offline pill */}
            <div
              className={cn(
                'flex items-center gap-3 rounded-full border px-6 py-2.5 text-base',
                online ? 'text-muted-foreground' : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
              )}
              role="status"
            >
              {online ? <Wifi className="size-[1.75rem]" aria-hidden /> : <WifiOff className="size-[1.75rem]" aria-hidden />}
              <span className="hidden sm:inline">{online ? 'Online' : 'Offline · saving locally'}</span>
              <span className="sr-only sm:hidden">{online ? 'Online' : 'Offline, saving locally'}</span>
            </div>
            {/* Account & sync button — 3× original (36px → 108px) */}
            <Link
              href="/account"
              aria-label="Account and sync"
              className="flex size-[6.75rem] items-center justify-center rounded-2xl text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <UserCircle className="size-[3.75rem]" aria-hidden />
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
