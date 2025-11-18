import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useAuth, useSignIn } from '@clerk/clerk-react'
import { useOAuth } from '@/renderer/lib/auth/use-oauth'
import { Button } from '@/renderer/components/ui/button'
import { Input } from '@/renderer/components/ui/input'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage
})

function SignInPage(): React.JSX.Element {
  const { isSignedIn } = useAuth()

  const { signIn, isLoaded, setActive } = useSignIn()
  const { startOAuthFlow, isPopupOpen } = useOAuth({ strategy: 'oauth_google' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleOAuthLogin = async (): Promise<void> => {
    await startOAuthFlow()
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!isLoaded) return
    setError(null)

    try {
      const result = await signIn.create({
        identifier: email,
        password
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.navigate({ to: '/' })
      } else {
        console.log(result)
        setError('Something went wrong during sign in.')
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkErr = err as { errors: { longMessage: string }[] }
        setError(clerkErr.errors[0]?.longMessage || 'Error signing in')
      } else {
        setError('Error signing in')
      }
    }
  }

  if (isSignedIn) {
    router.navigate({ to: '/' })
  }
  return (
    <div className="flex min-h-screen min-w-md flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Sign In</h1>

      <Button
        variant="outline"
        className="w-full max-w-xs"
        type="button"
        onClick={handleOAuthLogin}
        disabled={isPopupOpen}
      >
        {isPopupOpen && (
          <svg
            className="mr-3 -ml-1 size-5 animate-spin"
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
      </Button>

      <div className="text-sm text-neutral-400">or</div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-2">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>

      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link to="/sign-up" className="underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}
