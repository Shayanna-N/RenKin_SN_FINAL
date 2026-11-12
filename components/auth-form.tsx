'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name: String(form.get('name') ?? '') })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (error) {
      setError(isSignUp ? 'Could not create that account. Try a different email.' : 'Email or password is incorrect.')
      return
    }
    router.push('/account')
    router.refresh()
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">R</span>
          </span>
          <span className="text-lg font-semibold tracking-tight">Renkin</span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {isSignUp ? 'Create your Renkin account' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {isSignUp
            ? 'Sync your card and contacts across phone, desktop and watch.'
            : 'Sign in to sync contacts and get live contact updates.'}
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" required />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={8}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {isSignUp ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account? ' : 'New to Renkin? '}
          <Link href={isSignUp ? '/sign-in' : '/sign-up'} className="font-medium text-foreground underline underline-offset-4">
            {isSignUp ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {'Renkin works without an account too — everything is saved on this device.'}
        </p>
      </div>
    </main>
  )
}
