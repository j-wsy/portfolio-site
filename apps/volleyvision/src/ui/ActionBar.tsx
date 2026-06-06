import { useState, useRef } from 'react'
import { useStore } from '../store/useStore'

const pill = 'flex items-center gap-3 px-5 py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/10 select-none'
const btn  = 'px-6 py-3 rounded-2xl text-lg font-semibold transition-colors whitespace-nowrap'
const btnNeutral = `${btn} text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/10`
const btnPrimary = `${btn} bg-blue-500 hover:bg-blue-600 text-white`
const btnDanger  = `${btn} bg-red-500/90 hover:bg-red-600 text-white`
const btnActive  = `${btn} bg-amber-500 hover:bg-amber-600 text-white`
const sep = 'w-px h-5 bg-gray-300 dark:bg-gray-600 self-center mx-0.5'

interface ActionBarProps {
  placingMode: boolean
  unsavedNewSet: boolean
  onCreateNewSet: () => void
  onSaveComplete: () => void
}

export default function ActionBar({
  placingMode,
  unsavedNewSet,
  onCreateNewSet,
  onSaveComplete,
}: ActionBarProps) {
  const landingPosition  = useStore((s) => s.trajectoryDraft.landingPosition)
  const settingsOpen     = useStore((s) => s.settingsOpen)
  const setSettingsOpen  = useStore((s) => s.setSettingsOpen)
  const presetsOpen      = useStore((s) => s.presetsOpen)
  const setPresetsOpen   = useStore((s) => s.setPresetsOpen)
  const savePreset       = useStore((s) => s.savePreset)

  const [saving, setSaving] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [placementWarning, setPlacementWarning] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const handleSaveClick = () => {
    if (placingMode && !landingPosition) {
      setSaving(false)
      setPlacementWarning(true)
      window.setTimeout(() => setPlacementWarning(false), 1800)
      return
    }
    setSaving(true)
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }
  const handleSaveConfirm = () => {
    savePreset(presetName.trim() || 'Preset')
    setPresetName('')
    setSaving(false)
    onSaveComplete()
  }
  const handleSaveKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveConfirm()
    if (e.key === 'Escape') { setSaving(false); setPresetName('') }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
      {unsavedNewSet && (
        <div className="rounded-xl border border-red-400/30 bg-red-950/55 px-4 py-2 text-sm font-semibold text-red-200 shadow-lg backdrop-blur-md">
          New Set not yet saved.
        </div>
      )}
      {placementWarning && (
        <div className="rounded-xl border border-red-400/30 bg-red-950/55 px-4 py-2 text-sm font-semibold text-red-200 shadow-lg backdrop-blur-md">
          Finish placing your set first!
        </div>
      )}

      <div className={pill}>
        {/* Place Set section */}
        <button
          onClick={onCreateNewSet}
          className={placingMode ? btnDanger : btnPrimary}
        >
          {placingMode ? 'Cancel' : 'Create New Set'}
        </button>

        <div className={sep} />

        {/* Tools section */}
        <div className="relative">
          {saving && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg whitespace-nowrap">
              <input
                ref={nameInputRef}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={handleSaveKeyDown}
                placeholder="Preset name"
                className="w-44 px-3 py-2 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleSaveConfirm}
                className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-base font-semibold"
              >
                Save Set
              </button>
              <button
                onClick={() => { setSaving(false); setPresetName('') }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-base leading-none px-1"
              >
                x
              </button>
            </div>
          )}
          <button onClick={handleSaveClick} className={btnNeutral}>Save Set</button>
        </div>

        <button
          onClick={() => setPresetsOpen(!presetsOpen)}
          className={presetsOpen ? btnActive : btnNeutral}
        >
          Presets
        </button>

        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={settingsOpen ? btnActive : btnNeutral}
        >
          Settings
        </button>
      </div>
    </div>
  )
}
