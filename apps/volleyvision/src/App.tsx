import { useState } from 'react'

export default function App() {
  const [dark, setDark] = useState(true)

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
        VolleyVision
      </h1>
      <p className="text-lg text-gray-500 dark:text-gray-400">coming soon</p>
      <button
        onClick={toggle}
        className="mt-4 px-5 py-2 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
      >
        {dark ? 'Switch to light mode' : 'Switch to dark mode'}
      </button>
    </div>
  )
}
