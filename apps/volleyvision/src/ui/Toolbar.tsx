import { useState } from 'react'
import { useStore } from '../store/useStore'

interface ToolbarProps {
  placingMode: boolean
  onTogglePlacing: () => void
}

export default function Toolbar({ placingMode, onTogglePlacing }: ToolbarProps) {
  const darkMode = useStore((s) => s.darkMode)
  const toggleDark = useStore((s) => s.toggleDark)
  const setActivePanel = useStore((s) => s.setActivePanel)
  const activePanel = useStore((s) => s.activePanel)
  const savePreset = useStore((s) => s.savePreset)
  const resetTrajectory = useStore((s) => s.resetTrajectory)

  const [savingName, setSavingName] = useState(false)
  const [presetName, setPresetName] = useState('')

  const handleSave = () => {
    if (!presetName.trim()) return
    savePreset(presetName.trim())
    setPresetName('')
    setSavingName(false)
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <span className="font-bold text-gray-900 dark:text-white tracking-tight mr-2">
        VolleyVision
      </span>

      <span className="text-xs text-gray-400 uppercase tracking-wider mr-2">Setting</span>

      <button
        onClick={onTogglePlacing}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
          placingMode
            ? 'bg-green-500 text-white'
            : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700'
        }`}
      >
        {placingMode ? 'Placing...' : 'Place Set'}
      </button>

      {!placingMode && (
        <button
          onClick={resetTrajectory}
          className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          Clear Arc
        </button>
      )}

      <div className="flex-1" />

      {savingName ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave() }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name…"
            className="px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-36"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setSavingName(false)}
            className="px-2 py-1 rounded-lg text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setSavingName(true)}
          className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          Save Preset
        </button>
      )}

      <button
        onClick={() => setActivePanel(activePanel === 'preset' ? null : 'preset')}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
          activePanel === 'preset'
            ? 'bg-amber-500 text-white'
            : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700'
        }`}
      >
        Presets
      </button>

      <button
        onClick={toggleDark}
        className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
      >
        {darkMode ? '☀' : '☾'}
      </button>
    </div>
  )
}
