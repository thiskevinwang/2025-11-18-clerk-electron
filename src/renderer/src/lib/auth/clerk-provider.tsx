import {
  ClerkProvider as ClerkProviderPrimitive,
  type ClerkProviderProps
} from '@clerk/clerk-react'

import { getClerkInstance } from './clerk-instance'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const clerk = getClerkInstance({ publishableKey })

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable')
}

type ExtraProps = Pick<ClerkProviderProps, 'routerPush' | 'routerReplace'>
export const ClerkProvider = ({ children, ...props }: React.PropsWithChildren<ExtraProps>) => {
  return (
    <ClerkProviderPrimitive
      key={publishableKey}
      publishableKey={publishableKey}
      Clerk={clerk}
      standardBrowser={false}
      {...props}
    >
      {children}
    </ClerkProviderPrimitive>
  )
}
