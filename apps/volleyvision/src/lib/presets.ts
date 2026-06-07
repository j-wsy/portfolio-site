import type { Folder, NetConfig, Preset, SetterConfig } from '../store/useStore'
import { STARTER_PRESETS } from './starterData'
import type { Units } from './units'

const STORAGE_KEY = 'volleyvision-presets'

export interface AppDataSettings {
  units: Units
  setter: SetterConfig
  net: NetConfig
  showOpponentCourt: boolean
  lockHitzoneToReach: boolean
  hitzoneMustStayInCourt: boolean
}

export interface AppDataPayload {
  schemaVersion: 2
  app: 'VolleyVision'
  appVersion: string
  exportedAt: string
  presets: Preset[]
  folders: Folder[]
  settings: AppDataSettings
}

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

export function exportDataToFile(payload: Omit<AppDataPayload, 'schemaVersion' | 'app' | 'exportedAt'>): void {
  const data: AppDataPayload = {
    schemaVersion: 2,
    app: 'VolleyVision',
    exportedAt: new Date().toISOString(),
    ...payload,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'volleyvision-data.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImportedPresets(json: string): {
  presets: Preset[]
  folders?: Folder[]
  settings?: Partial<AppDataSettings>
  error?: string
} {
  try {
    const parsed = JSON.parse(json)
    if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) {
      return { presets: [], error: 'Invalid schema version - expected schemaVersion: 1 or 2' }
    }
    if (!Array.isArray(parsed.presets)) {
      return { presets: [], error: 'Invalid format: presets must be an array' }
    }
    return {
      presets: parsed.presets as Preset[],
      folders: Array.isArray(parsed.folders) ? parsed.folders as Folder[] : undefined,
      settings: parsed.schemaVersion === 2 && parsed.settings ? parsed.settings as Partial<AppDataSettings> : undefined,
    }
  } catch {
    return { presets: [], error: 'Failed to parse JSON - check the file is valid' }
  }
}
