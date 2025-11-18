import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useAuth, useSignUp } from '@clerk/clerk-react'
import { useOAuth } from '@/renderer/lib/auth/use-oauth'
import { Button } from '@/renderer/components/ui/button'
import { Input } from '@/renderer/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/renderer/components/ui/input-otp'

export const Route = createFileRoute('/sign-up')({
  component: SignUpPage
})

function SignUpPage(): React.JSX.Element {
  const { isSignedIn } = useAuth()

  const { isLoaded, signUp, setActive } = useSignUp()
  const { startOAuthFlow, isPopupOpen } = useOAuth({ strategy: 'oauth_google' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [code, setCode] = useState('')
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
      await signUp.create({
        emailAddress: email,
        password
      })

      // send the email.
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      setPendingVerification(true)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkErr = err as { errors: { longMessage: string }[] }
        setError(clerkErr.errors[0]?.longMessage || 'Error creating account')
      } else {
        setError('Error creating account')
      }
    }
  }

  const handleVerification = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!isLoaded) return
    setError(null)

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code
      })

      if (completeSignUp.status !== 'complete') {
        /*  investigate the response, to see what is there */
        console.log(JSON.stringify(completeSignUp, null, 2))
        setError('Verification failed. Please try again.')
      }

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId })
        router.navigate({ to: '/' })
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkErr = err as { errors: { longMessage: string }[] }
        setError(clerkErr.errors[0]?.longMessage || 'Error verifying code')
      } else {
        setError('Error verifying code')
      }
    }
  }

  if (pendingVerification) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <h1 className="text-2xl font-bold">Verify Email</h1>
        <form
          onSubmit={handleVerification}
          className="flex w-full max-w-xs flex-col items-center gap-2"
        >
          <InputOTP maxLength={6} value={code} onChange={(value) => setCode(value)}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">
            Verify
          </Button>
        </form>
      </div>
    )
  }

  if (isSignedIn) {
    router.navigate({ to: '/' })
  }
  return (
    <div className="flex min-h-screen min-w-md flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Sign Up</h1>

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
          Sign Up
        </Button>
      </form>

      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link to="/sign-in" className="underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}
