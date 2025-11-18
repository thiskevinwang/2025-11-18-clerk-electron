import type { FapiRequestInit, FapiResponse } from '@clerk/clerk-js/dist/types/core/fapiClient'
import { Clerk } from '@clerk/clerk-js'

const KEY = '__clerk_client_jwt'

import { channels } from '@/shared/constants'

// Use IPC to cache the Clerk token in the main process
const IpcTokenCache = {
  async getToken(key: string) {
    return await window.electron.ipcRenderer.invoke(channels.AUTH_TOKEN_GET, key)
  },
  async saveToken(key: string, token: string) {
    return window.electron.ipcRenderer.send(channels.AUTH_TOKEN_SET, key, token)
  },
  clearToken(key: string) {
    return window.electron.ipcRenderer.send(channels.AUTH_TOKEN_CLEAR, key)
  }
}

let __internal_clerk: Clerk

// NOTE: This is largely adapted from the `@clerk/clerk-expo` SDK.
// https://github.com/clerk/javascript/blob/866008c0db46d31e383b71898709de819d2fed06/packages/expo/src/provider/singleton/createClerkInstance.ts#L34
function createClerkInstance(ClerkClass: typeof Clerk) {
  return (options: { publishableKey?: string; tokenCache?: typeof IpcTokenCache }): Clerk => {
    const {
      publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
      tokenCache = IpcTokenCache
    } = options || {}

    if (!__internal_clerk && !publishableKey) {
      throw new Error('Missing Publishable Key')
    }

    // Support "hot-swapping" the Clerk instance at runtime. See JS-598 for additional details.
    const hasKeyChanged =
      __internal_clerk && !!publishableKey && publishableKey !== __internal_clerk.publishableKey

    if (!__internal_clerk || hasKeyChanged) {
      if (hasKeyChanged) {
        tokenCache.clearToken?.(KEY)
      }

      const getToken = tokenCache.getToken
      const saveToken = tokenCache.saveToken
      __internal_clerk = new ClerkClass(publishableKey)

      // This is an internal API
      __internal_clerk.__unstable__onBeforeRequest(async (requestInit: FapiRequestInit) => {
        console.log('[clerk] onBeforeRequest', requestInit)
        // https://reactnative.dev/docs/0.61/network#known-issues-with-fetch-and-cookie-based-authentication
        requestInit.credentials = 'omit'

        // Instructs the backend to parse the api token from the Authorization header.
        requestInit.url?.searchParams.append('_is_native', '1')

        const jwt = await getToken(KEY)
        ;(requestInit.headers as Headers).set('authorization', jwt || '')
        ;(requestInit.headers as Headers).set('x-mobile', '1')
      })

      let nativeApiErrorShown = false
      __internal_clerk.__unstable__onAfterResponse(
        async (_: FapiRequestInit, response?: FapiResponse<unknown>) => {
          console.log('[clerk] onAfterResponse', response)
          if (!response) return

          // Extract and store the __client JWT from the Authorization header
          const authHeader = response.headers.get('authorization')
          if (authHeader) {
            await saveToken(KEY, authHeader)
          }

          // Handle native API disabled error
          if (
            !nativeApiErrorShown &&
            response.payload?.errors?.[0]?.code === 'native_api_disabled'
          ) {
            console.error(
              'The Native API is disabled for this instance.\nGo to Clerk Dashboard > Configure > Native applications to enable it.\nOr, navigate here: https://dashboard.clerk.com/last-active?path=native-applications'
            )
            nativeApiErrorShown = true
          }
        }
      )
    }
    return __internal_clerk
  }
}

export const getClerkInstance = createClerkInstance(Clerk)
