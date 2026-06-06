import type { Folder, Preset } from '../store/useStore'
import { STARTER_PRESETS } from './starterData'

const STORAGE_KEY = 'volleyvision-presets'

export function loadPresetsFromStorage(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return STARTER_PRESETS
    return JSON.parse(raw) as Preset[]
  } catch {
    return STARTER_PRESETS
  }
}

export function savePresetsToStorage(presets: Preset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function exportPresetsToFile(presets: Preset[], folders: Folder[]): void {
  const payload = JSON.stringify({ schemaVersion: 1, presets, folders }, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'volleyvision-presets.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImportedPresets(json: string): { presets: Preset[]; folders?: Folder[]; error?: string } {
  try {
    const parsed = JSON.parse(json)
    if (parsed.schemaVersion !== 1) {
      return { presets: [], error: 'Invalid schema version - expected schemaVersion: 1' }
    }
    if (!Array.isArray(parsed.presets)) {
      return { presets: [], error: 'Invalid format: presets must be an array' }
    }
    return {
      presets: parsed.presets as Preset[],
      folders: Array.isArray(parsed.folders) ? parsed.folders as Folder[] : undefined,
    }
  } catch {
    return { presets: [], error: 'Failed to parse JSON - check the file is valid' }
  }
}
