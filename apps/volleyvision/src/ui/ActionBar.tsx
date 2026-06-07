import { useState, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useIsMobile } from '../lib/useIsMobile'

const pill = 'flex items-center justify-center gap-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/60 dark:border-white/10 select-none'
const btn  = 'rounded-2xl font-semibold transition-colors whitespace-nowrap'
const btnSize = (isMobile: boolean) => isMobile ? 'px-3 py-2 text-sm' : 'px-6 py-3 text-lg'
const btnNeutral = `${btn} text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/10`
const btnPrimary = `${btn} bg-blue-500 hover:bg-blue-600 text-white`
const btnDanger = `${btn} bg-red-500/90 hover:bg-red-600 text-white`
const btnActive = `${btn} bg-amber-500 hover:bg-amber-600 text-white`
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
  const isMobile = useIsMobile()
  const landingPosition  = useStore((s) => s.trajectoryDraft.landingPosition)
  const settingsOpen     = useStore((s) => s.settingsOpen)
  const setSettingsOpen  = useStore((s) => s.setSettingsOpen)
  const presetsOpen      = useStore((s) => s.presetsOpen)
  const setPresetsOpen   = useStore((s) => s.setPresetsOpen)
  const instructionsOpen = useStore((s) => s.instructionsOpen)
  const setInstructionsOpen = useStore((s) => s.setInstructionsOpen)
  const savePreset       = useStore((s) => s.savePreset)

  const [saving, setSaving] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [placementWarning, setPlacementWarning] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const handleSaveClick = () => {
    if (!landingPosition) {
      setSaving(false)
      setPlacementWarning(true)
      window.setTimeout(() => setPlacementWarning(false), 1800)
      return
    }
    setSaving(true)
    if (isMobile) return
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }
  const closeSaveForm = () => {
    setSaving(false)
    setPresetName('')
    window.scrollTo(0, 0)
  }
  const handleSaveConfirm = () => {
    savePreset(presetName.trim() || 'Preset')
    closeSaveForm()
    onSaveComplete()
  }
  const handleSaveKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveConfirm()
    if (e.key === 'Escape') closeSaveForm()
  }

  return (
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex w-[calc(100vw-0.75rem)] sm:w-auto flex-col items-center gap-2">
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

      <div className={`${pill} ${isMobile ? 'w-full flex-nowrap px-2 py-2 gap-1.5' : 'px-5 py-4'}`}>
        {/* Place Set section */}
        <button
          onClick={onCreateNewSet}
          className={`${placingMode ? btnDanger : btnPrimary} ${btnSize(isMobile)} ${isMobile ? 'flex-[1.05] min-w-0' : ''}`}
        >
          {placingMode ? 'Cancel' : (isMobile ? 'New Set' : 'Create New Set')}
        </button>

        {!isMobile && <div className={sep} />}

        {/* Tools section */}
        <div className="relative">
          {saving && (
            <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${isMobile ? 'w-max max-w-[calc(100vw-1rem)]' : 'whitespace-nowrap'}`}>
              <input
                ref={nameInputRef}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={handleSaveKeyDown}
                placeholder="Preset name"
                className="min-w-0 w-36 px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleSaveConfirm}
                className="px-2.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold whitespace-nowrap"
              >
                Save as Preset
              </button>
              <button
                onClick={closeSaveForm}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-red-500 text-sm font-semibold leading-none text-white hover:bg-red-600 transition-colors"
                aria-label="Close save popup"
              >
                x
              </button>
            </div>
          )}
          <button onClick={handleSaveClick} className={`${saving ? btnActive : btnNeutral} ${btnSize(isMobile)} ${isMobile ? 'min-w-0' : ''}`}>{isMobile ? 'Save' : 'Save Set'}</button>
        </div>

        <button
          onClick={() => setPresetsOpen(!presetsOpen)}
          className={`${presetsOpen ? btnActive : btnNeutral} ${btnSize(isMobile)} ${isMobile ? 'min-w-0' : ''}`}
        >
          Presets
        </button>

        <button
          onClick={() => setInstructionsOpen(!instructionsOpen)}
          aria-label="Instructions"
          title="Instructions"
          className={`${instructionsOpen ? btnActive : btnNeutral} ${isMobile ? 'px-2.5 py-2' : 'px-4 py-3'}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.1-2.5 4" />
            <path d="M12 17h.01" />
          </svg>
        </button>

        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-label="Settings"
          title="Settings"
          className={`${settingsOpen ? btnActive : btnNeutral} ${isMobile ? 'px-2.5 py-2' : 'px-4 py-3'}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7A2 2 0 0 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3.1V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 0 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
