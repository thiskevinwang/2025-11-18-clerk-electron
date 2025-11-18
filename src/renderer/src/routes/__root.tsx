import { createRootRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Versions from '@/renderer/components/Versions'
import { ThemeProvider, useTheme } from '@/renderer/components/theme-provider'
import { ClerkProvider } from '@/renderer/lib/auth/clerk-provider'

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme()
  return (
    <select
      className="text-xs text-neutral-500 dark:text-neutral-400"
      value={theme}
      onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  )
}

const RootLayout = () => {
  const router = useRouter()
  return (
    <ThemeProvider>
      <ClerkProvider
        routerPush={(to) =>
          router.navigate({
            href: to
          })
        }
        routerReplace={(to) => {
          router.navigate({
            href: to,
            replace: true
          })
        }}
      >
        <div className="flex gap-2 p-2">
          <Link to="/" className="[&.active]:font-bold">
            Home
          </Link>{' '}
          <Link to="/about" className="[&.active]:font-bold">
            About
          </Link>
        </div>
        <hr />
        <Outlet />
        {/* <TanStackRouterDevtools /> */}
        <footer className="absolute bottom-0 left-0 h-5 w-full border-t border-t-neutral-200 px-4 dark:border-t-neutral-700">
          <div className="flex h-full flex-row items-center justify-between">
            <ThemeSelector />

            <Versions />
          </div>
        </footer>
      </ClerkProvider>
    </ThemeProvider>
  )
}

export const Route = createRootRoute({ component: RootLayout })
