import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_NET_HEIGHT,
  DEFAULT_SETTER_HEIGHT,
  DEFAULT_PEAK_HEIGHT,
} from '../lib/constants'
import {
  loadPresetsFromStorage,
  savePresetsToStorage,
  exportPresetsToFile,
  parseImportedPresets,
} from '../lib/presets'

export interface SetterConfig {
  heightM: number
  jumpSet: boolean
}

export interface NetConfig {
  heightM: number
}

export interface TrajectoryDraft {
  landingPosition: [number, number, number] | null
  peakHeight: number
  committed: boolean
}

export interface Preset {
  id: string
  name: string
  schemaVersion: 1
  mode: 'setting'
  setterPosition: [number, number]
  setter: SetterConfig
  net: NetConfig
  trajectory: {
    landingPosition: [number, number]
    peakHeight: number
  }
}

export interface AppStore {
  darkMode: boolean
  toggleDark: () => void

  mode: 'setting'

  setterPosition: [number, number]
  setter: SetterConfig
  net: NetConfig
  trajectoryDraft: TrajectoryDraft

  activePanel: 'setter' | 'net' | 'preset' | null

  presets: Preset[]

  setSetterPosition: (pos: [number, number]) => void
  updateSetter: (patch: Partial<SetterConfig>) => void
  updateNet: (patch: Partial<NetConfig>) => void
  setLandingPosition: (pos: [number, number, number] | null) => void
  setPeakHeight: (h: number) => void
  commitTrajectory: () => void
  resetTrajectory: () => void
  setActivePanel: (panel: AppStore['activePanel']) => void
  savePreset: (name: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
  importPresets: (json: string) => void
  exportPresets: () => void
}

const defaultTrajectory: TrajectoryDraft = {
  landingPosition: null,
  peakHeight: DEFAULT_PEAK_HEIGHT,
  committed: false,
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      darkMode: true,
      toggleDark: () => {
        const next = !get().darkMode
        set({ darkMode: next })
        document.documentElement.classList.toggle('dark', next)
      },

      mode: 'setting',

      setterPosition: [3, 0],
      setter: { heightM: DEFAULT_SETTER_HEIGHT, jumpSet: false },
      net: { heightM: DEFAULT_NET_HEIGHT },
      trajectoryDraft: defaultTrajectory,

      activePanel: null,

      presets: loadPresetsFromStorage(),

      setSetterPosition: (pos) => set({ setterPosition: pos }),
      updateSetter: (patch) =>
        set((s) => ({ setter: { ...s.setter, ...patch } })),
      updateNet: (patch) =>
        set((s) => ({ net: { ...s.net, ...patch } })),
      setLandingPosition: (pos) =>
        set((s) => ({
          trajectoryDraft: { ...s.trajectoryDraft, landingPosition: pos, committed: false },
        })),
      setPeakHeight: (h) =>
        set((s) => ({
          trajectoryDraft: { ...s.trajectoryDraft, peakHeight: h },
        })),
      commitTrajectory: () =>
        set((s) => ({
          trajectoryDraft: { ...s.trajectoryDraft, committed: true },
        })),
      resetTrajectory: () => set({ trajectoryDraft: defaultTrajectory }),

      setActivePanel: (panel) => set({ activePanel: panel }),

      savePreset: (name) => {
        const s = get()
        const { landingPosition, peakHeight } = s.trajectoryDraft
        const preset: Preset = {
          id: Date.now().toString(36),
          name,
          schemaVersion: 1,
          mode: 'setting',
          setterPosition: s.setterPosition,
          setter: { ...s.setter },
          net: { ...s.net },
          trajectory: {
            landingPosition: landingPosition ? [landingPosition[0], landingPosition[2]] : [0, 0],
            peakHeight,
          },
        }
        const updated = [...s.presets, preset]
        savePresetsToStorage(updated)
        set({ presets: updated })
      },

      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id)
        if (!preset) return
        const landingPos: [number, number, number] | null =
          preset.trajectory.landingPosition
            ? [preset.trajectory.landingPosition[0], 0, preset.trajectory.landingPosition[1]]
            : null
        set({
          setterPosition: preset.setterPosition,
          setter: { ...preset.setter },
          net: { ...preset.net },
          trajectoryDraft: {
            landingPosition: landingPos,
            peakHeight: preset.trajectory.peakHeight,
            committed: !!landingPos,
          },
          activePanel: null,
        })
      },

      deletePreset: (id) => {
        const updated = get().presets.filter((p) => p.id !== id)
        savePresetsToStorage(updated)
        set({ presets: updated })
      },

      importPresets: (json) => {
        const { presets: incoming, error } = parseImportedPresets(json)
        if (error) throw new Error(error)
        const existing = get().presets
        const existingIds = new Set(existing.map((p) => p.id))
        const merged = [...existing, ...incoming.filter((p) => !existingIds.has(p.id))]
        savePresetsToStorage(merged)
        set({ presets: merged })
      },

      exportPresets: () => {
        exportPresetsToFile(get().presets)
      },
    }),
    {
      name: 'volleyvision-store',
      partialize: (s) => ({
        darkMode: s.darkMode,
        setter: s.setter,
        net: s.net,
        presets: s.presets,
      }),
    }
  )
)
