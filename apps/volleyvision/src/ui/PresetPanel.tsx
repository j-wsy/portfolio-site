import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'

export default function PresetPanel() {
  const presets = useStore((s) => s.presets)
  const loadPreset = useStore((s) => s.loadPreset)
  const deletePreset = useStore((s) => s.deletePreset)
  const importPresets = useStore((s) => s.importPresets)
  const exportPresets = useStore((s) => s.exportPresets)
  const setActivePanel = useStore((s) => s.setActivePanel)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        importPresets(ev.target!.result as string)
        setImportError(null)
      } catch (err: any) {
        setImportError(err.message ?? 'Import failed')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="absolute top-16 right-4 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 z-20 max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Presets</h2>
        <button
          onClick={() => setActivePanel(null)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={exportPresets}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Export all
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Import
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      {importError && (
        <div className="text-xs text-red-500 mb-2 p-2 bg-red-50 dark:bg-red-950 rounded-lg">
          {importError}
        </div>
      )}

      <div className="overflow-y-auto flex-1 flex flex-col gap-2">
        {presets.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No presets saved yet.</p>
        )}
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            onClick={() => { loadPreset(preset.id); setActivePanel(null) }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {preset.name}
              </div>
              <div className="text-xs text-gray-400">
                {preset.setter.jumpSet ? 'Jump set' : 'Standing'} · {Math.round(preset.setter.heightM * 100)}cm
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); deletePreset(preset.id) }}
              className="text-gray-400 hover:text-red-500 transition-colors text-sm flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
