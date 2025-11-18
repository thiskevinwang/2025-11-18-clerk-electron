import Versions from './components/Versions'
import { ThemeProvider, useTheme } from '@/renderer/components/theme-provider'

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

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <footer className="absolute bottom-0 left-0 h-5 w-full border-t border-t-neutral-200 px-4 dark:border-t-neutral-700">
        <div className="flex h-full flex-row items-center justify-between">
          <ThemeSelector />

          <Versions />
        </div>
      </footer>
    </ThemeProvider>
  )
}

export default App
