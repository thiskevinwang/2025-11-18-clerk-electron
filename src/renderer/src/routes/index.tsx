import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut, useClerk, UserButton, useSignIn, useSignUp } from '@clerk/clerk-react'

import { useOAuth } from '@/renderer/lib/auth/use-oauth'

export const Route = createFileRoute('/')({
  component: Index
})

function Index(): React.JSX.Element {
  const { startOAuthFlow, isPopupOpen } = useOAuth({ strategy: 'oauth_google' })

  const handleOAuthLogin = async (): Promise<void> => {
    await startOAuthFlow()
  }

  const { setActive } = useClerk()
  const { signIn, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignInMode = authMode === 'signIn'

  const handleCredentialsSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    setFormError(null)

    if (isSignInMode && !signIn) return
    if (!isSignInMode && !signUp) return

    try {
      setIsSubmitting(true)
      if (isSignInMode) {
        const res = await signIn!.create({
          strategy: 'password',
          identifier: email,
          password: password
        })
        if (res.status === 'complete') {
          setActive({ session: res.createdSessionId })
        }
      } else {
        const res = await signUp!.create({
          emailAddress: email,
          password
        })
        if (res.status === 'complete') {
          setActive({ session: res.createdSessionId })
        } else {
          setFormError('Check your email to complete your sign up, then come back to sign in.')
        }
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'errors' in error) {
        const typedError = error as {
          errors?: Array<{ message?: string; longMessage?: string }>
        }
        const apiError = typedError.errors?.[0]
        setFormError(
          apiError?.longMessage || apiError?.message || 'Something went wrong. Please try again.'
        )
      } else if (error instanceof Error) {
        setFormError(error.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <SignedIn>
        <UserButton />
      </SignedIn>
      <div className={'flex w-full flex-col items-center justify-center'}>
        <SignedOut>
          <button
            className="flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-white"
            type="button"
            onClick={handleOAuthLogin}
            disabled={isPopupOpen}
            aria-busy={isPopupOpen}
          >
            {isPopupOpen && (
              <svg
                className="mr-3 -ml-1 size-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            Continue with Google
          </button>
          <span className="text-sm text-slate-400">or continue with credentials</span>

          <div
            className="flex w-full max-w-xs gap-2 rounded-lg bg-slate-800/40 p-1"
            role="group"
            aria-label="Authentication mode"
          >
            {(
              [
                { id: 'signIn', label: 'Sign In' },
                { id: 'signUp', label: 'Sign Up' }
              ] as const
            ).map((mode) => {
              const isActive = authMode === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setAuthMode(mode.id)}
                  aria-pressed={isActive}
                  className={`flex-1 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-500 text-white' : 'text-slate-300'
                  }`}
                >
                  {mode.label}
                </button>
              )
            })}
          </div>

          <form
            onSubmit={handleCredentialsSubmit}
            className="flex w-full max-w-xs flex-col gap-2"
            noValidate
          >
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (isSignInMode ? !isSignInLoaded || !signIn : !isSignUpLoaded || !signUp) ||
                !email ||
                !password
              }
              aria-busy={isSubmitting}
              className="rounded-md bg-indigo-500 px-3 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isSubmitting ? 'Please wait…' : isSignInMode ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        </SignedOut>
      </div>
    </main>
  )
}

export default Index
