import { useCallback, useEffect, useRef, useState } from 'react'

import { useClerk, useSignIn, useSignUp } from '@clerk/clerk-react'
import type { OAuthStrategy } from '@clerk/types'

import { PRODUCTION_CALLBACK_URL, channels } from '@/shared/constants'
import { isClerkAPIResponseError } from '@clerk/clerk-js'

export type UseOAuthFlowParams = {
  strategy: OAuthStrategy
  redirectUrl?: string
  unsafeMetadata?: SignUpUnsafeMetadata
}

export type StartOAuthFlowParams = {
  redirectUrl?: string
  unsafeMetadata?: SignUpUnsafeMetadata
}

const getDefaultRedirectUrl = (): string => {
  if (import.meta.env.PROD) {
    return PRODUCTION_CALLBACK_URL
  }

  const base = import.meta.env.VITE_DOMAIN?.trim()
  if (!base) {
    return PRODUCTION_CALLBACK_URL
  }
  return `${base}sso-callback`
}

export const useOAuth = (
  useOAuthParams: UseOAuthFlowParams
): {
  startOAuthFlow: (startOAuthFlowParams?: StartOAuthFlowParams) => Promise<void>
  isPopupOpen: boolean
} => {
  const { strategy } = useOAuthParams || {}
  if (!strategy) {
    throw new Error('Missing oauth strategy')
  }
  const { setActive } = useClerk()
  const { signIn, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp()
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const popupCleanupCallbacksRef = useRef<Array<() => void>>([])

  const cleanupPopupTracking = useCallback(() => {
    popupCleanupCallbacksRef.current.forEach((off) => {
      try {
        off()
      } catch (error) {
        console.warn('[useOAuth] Failed to detach popup listener', error)
      }
    })
    popupCleanupCallbacksRef.current = []
  }, [])

  const stopTrackingPopup = useCallback(() => {
    setIsPopupOpen(false)
    cleanupPopupTracking()
  }, [cleanupPopupTracking])

  useEffect(() => {
    return () => {
      cleanupPopupTracking()
    }
  }, [cleanupPopupTracking])

  async function startOAuthFlow(startOAuthFlowParams?: StartOAuthFlowParams): Promise<void> {
    if (!isSignInLoaded || !isSignUpLoaded) {
      return
    }

    cleanupPopupTracking()

    const registerPopupCleanup = (off: () => void): void => {
      popupCleanupCallbacksRef.current.push(off)
    }

    setIsPopupOpen(true)

    // Listen for popup closed event to stop tracking
    registerPopupCleanup(
      window.electron.ipcRenderer.on(channels.AUTH_CLOSED_POPUP, () => {
        stopTrackingPopup()
      })
    )

    // Create a redirect url for the current platform and environment.
    //
    // This redirect URL needs to be whitelisted for your Clerk production instance via
    // https://clerk.com/docs/reference/backend-api/tag/redirect-urls/post/redirect_urls
    const oauthRedirectUrl =
      startOAuthFlowParams?.redirectUrl || useOAuthParams.redirectUrl || getDefaultRedirectUrl()

    try {
      await signIn.create({ strategy, redirectUrl: oauthRedirectUrl })

      const { externalVerificationRedirectURL } = signIn.firstFactorVerification

      if (strategy === 'oauth_google') {
        externalVerificationRedirectURL?.searchParams.set('prompt', 'consent')
      }

      // Notify main process to open the auth popup window
      window.electron.ipcRenderer.send(channels.AUTH_OPENED_POPUP, {
        url: externalVerificationRedirectURL?.toString() || '',
        callbackUrl: oauthRedirectUrl
      })
    } catch (error) {
      stopTrackingPopup()
      if (isClerkAPIResponseError(error)) {
        // console.error('clerk_error', error.code, error.message, error.longMessage, error.errors)
        if (error.errors?.[0].code === 'session_exists') {
          window.location.reload()
          return
        }
      }
      throw error
    }

    // Listen for auth callback from the popup
    const authCallbackOff = window.electron.ipcRenderer.on(
      channels.AUTH_CALLBACK,
      async (_event, ssoUrl: string) => {
        stopTrackingPopup()

        const url = new URL(ssoUrl)
        console.log('[useOAuth] Received SSO callback URL:', ssoUrl)

        const params = url.searchParams

        const rotatingTokenNonce = params.get('rotating_token_nonce') || ''
        let createdSessionId = params.get('created_session_id') || ''
        await signIn.reload({ rotatingTokenNonce })

        const { status, firstFactorVerification } = signIn

        if (status === 'complete') {
          createdSessionId = signIn.createdSessionId!
        } else if (firstFactorVerification.status === 'transferable') {
          await signUp.create({
            transfer: true,
            unsafeMetadata: startOAuthFlowParams?.unsafeMetadata || useOAuthParams.unsafeMetadata
          })
          createdSessionId = signUp.createdSessionId || ''
        }

        if (createdSessionId) {
          await setActive({ session: createdSessionId })
        } else {
          // Use signIn or signUp for next steps such as MFA
        }
      }
    )

    registerPopupCleanup(authCallbackOff)
  }

  return {
    startOAuthFlow,
    isPopupOpen
  }
}
