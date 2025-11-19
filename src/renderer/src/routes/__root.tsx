import { createRootRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Versions from '@/renderer/components/Versions'
import { ThemeProvider, useTheme } from '@/renderer/components/theme-provider'
import { ClerkProvider } from '@/renderer/lib/auth/clerk-provider'
import { SignedIn } from '@/renderer/lib/auth/control'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@/renderer/components/ui/command'
import { useState, useEffect } from 'react'

const CommandMenu = () => {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

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
        <SignedIn>
          <header className="bg-background absolute top-0 left-0 h-10 w-full border-b border-b-neutral-200 px-4 dark:border-b-neutral-700">
            <div className="flex h-full flex-row items-center gap-4">
              <Link to="/" className="[&.active]:font-bold">
                Home
              </Link>{' '}
              <Link to="/about" className="[&.active]:font-bold">
                About
              </Link>
            </div>
          </header>
        </SignedIn>

        <Outlet />
        {/* <TanStackRouterDevtools /> */}
        <footer className="absolute bottom-0 left-0 h-5 w-full border-t border-t-neutral-200 px-4 dark:border-t-neutral-700">
          <div className="flex h-full flex-row items-center justify-between">
            <ThemeSelector />

            <Versions />
          </div>
        </footer>

        <CommandMenu />
      </ClerkProvider>
    </ThemeProvider>
  )
}

export const Route = createRootRoute({
  component: RootLayout
})
