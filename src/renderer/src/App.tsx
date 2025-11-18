import Versions from './components/Versions'

function App(): React.JSX.Element {
  return (
    <>
      <footer className="absolute bottom-0 left-0 h-5 w-full border-t border-t-neutral-200 px-4">
        <Versions />
      </footer>
    </>
  )
}

export default App
