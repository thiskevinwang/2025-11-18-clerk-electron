import { useState } from 'react'

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions)

  return (
    <ul className="flex h-full flex-row items-center justify-end gap-4 text-xs text-neutral-500 dark:text-neutral-400">
      <li>Electron {versions.electron}</li>
      <li>Chromium {versions.chrome}</li>
      <li>Node {versions.node}</li>
    </ul>
  )
}

export default Versions
