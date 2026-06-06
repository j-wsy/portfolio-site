import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_NET_HEIGHT,
  DEFAULT_SETTER_HEIGHT,
  DEFAULT_PEAK_HEIGHT,
  MIN_SETTER_HEIGHT,
} from '../lib/constants'
import {
  loadPresetsFromStorage,
  savePresetsToStorage,
  exportPresetsToFile,
  parseImportedPresets,
} from '../lib/presets'
import { STARTER_FOLDERS } from '../lib/starterData'
import type { Units } from '../lib/units'

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
  contactProgress: number
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
    contactProgress?: number
  }
}

export interface Folder {
  id: string
  name: string
  presetIds: string[]
}

export const UNSORTED_FOLDER_ID = 'unsorted'
export const UNSORTED_FOLDER_NAME = 'General'

export interface AppStore {
  darkMode: boolean

  mode: 'setting'

  settingsOpen: boolean
  presetsOpen: boolean
  instructionsOpen: boolean
  topPanel: 'settings' | 'presets' | 'instructions'
  units: Units
  activePresetId: string | null
  activeFolderId: string | null

  setterPosition: [number, number]
  setter: SetterConfig
  net: NetConfig
  trajectoryDraft: TrajectoryDraft

  showOpponentCourt: boolean
  toggleOpponentCourt: () => void

  presets: Preset[]
  folders: Folder[]

  setSetterPosition: (pos: [number, number]) => void
  updateSetter: (patch: Partial<SetterConfig>) => void
  updateNet: (patch: Partial<NetConfig>) => void
  setLandingPosition: (pos: [number, number, number] | null) => void
  setPeakHeight: (h: number) => void
  setContactProgress: (progress: number) => void
  commitTrajectory: () => void
  setSettingsOpen: (open: boolean) => void
  setPresetsOpen: (open: boolean) => void
  setInstructionsOpen: (open: boolean) => void
  toggleUnits: () => void
  savePreset: (name: string, folderId?: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
  renamePreset: (id: string, name: string) => void
  importPresets: (json: string) => void
  exportPresets: () => void
  createFolder: (name: string) => void
  deleteFolder: (id: string) => void
  renameFolder: (id: string, name: string) => void
  addPresetToFolder: (presetId: string, folderId: string) => void
  setActiveFolderId: (id: string | null) => void
}

function ensureUnsortedFolder(folders: Folder[]): Folder[] {
  const cleaned = folders.map((folder) =>
    folder.id === UNSORTED_FOLDER_ID
      ? { ...folder, name: UNSORTED_FOLDER_NAME }
      : folder
  )

  return cleaned.some((folder) => folder.id === UNSORTED_FOLDER_ID)
    ? cleaned
    : [{ id: UNSORTED_FOLDER_ID, name: UNSORTED_FOLDER_NAME, presetIds: [] }, ...cleaned]
}

function normalizeSetter(setter: SetterConfig): SetterConfig {
  return {
    ...setter,
    heightM: Math.max(MIN_SETTER_HEIGHT, setter.heightM),
  }
}

const defaultTrajectory: TrajectoryDraft = {
  landingPosition: null,
  peakHeight: DEFAULT_PEAK_HEIGHT,
  contactProgress: 0.7,
  committed: false,
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      darkMode: true,

      mode: 'setting',

      settingsOpen: false,
      presetsOpen: false,
      instructionsOpen: false,
      topPanel: 'instructions',
      units: 'metric',
      activePresetId: null,
      activeFolderId: null,

      setterPosition: [3, 0],
      setter: { heightM: DEFAULT_SETTER_HEIGHT, jumpSet: false },
      net: { heightM: DEFAULT_NET_HEIGHT },
      trajectoryDraft: defaultTrajectory,

      showOpponentCourt: true,
      toggleOpponentCourt: () => set((s) => ({ showOpponentCourt: !s.showOpponentCourt })),

      presets: loadPresetsFromStorage(),
      folders: ensureUnsortedFolder(STARTER_FOLDERS),

      setSetterPosition: (pos) => set({ setterPosition: pos }),
      updateSetter: (patch) =>
        set((s) => ({ setter: normalizeSetter({ ...s.setter, ...patch }) })),
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
      setContactProgress: (progress) =>
        set((s) => ({
          trajectoryDraft: {
            ...s.trajectoryDraft,
            contactProgress: Math.min(0.98, Math.max(0.02, progress)),
          },
        })),
      commitTrajectory: () =>
        set((s) => ({
          trajectoryDraft: { ...s.trajectoryDraft, committed: true },
        })),

      setSettingsOpen: (open) => set({ settingsOpen: open, ...(open ? { topPanel: 'settings' as const } : {}) }),
      setPresetsOpen: (open) => set({ presetsOpen: open, ...(open ? { topPanel: 'presets' as const } : {}) }),
      setInstructionsOpen: (open) => set({ instructionsOpen: open, ...(open ? { topPanel: 'instructions' as const } : {}) }),
      toggleUnits: () =>
        set((s) => ({ units: s.units === 'metric' ? 'imperial' : 'metric' })),

      savePreset: (name, folderId) => {
        const s = get()
        const { landingPosition, peakHeight, contactProgress } = s.trajectoryDraft
        const id = Date.now().toString(36)
        const targetFolderId = folderId ?? s.activeFolderId ?? UNSORTED_FOLDER_ID
        const folders = ensureUnsortedFolder(s.folders)
        const preset: Preset = {
          id,
          name,
          schemaVersion: 1,
          mode: 'setting',
          setterPosition: s.setterPosition,
          setter: { ...s.setter },
          net: { ...s.net },
          trajectory: {
            landingPosition: landingPosition ? [landingPosition[0], landingPosition[2]] : [0, 0],
            peakHeight,
            contactProgress,
          },
        }
        const updatedPresets = [...s.presets, preset]
        savePresetsToStorage(updatedPresets)

        const updatedFolders = folders.map((f) =>
          f.id === targetFolderId
            ? { ...f, presetIds: [...f.presetIds, id] }
            : f
        )
        set({
          presets: updatedPresets,
          folders: updatedFolders,
          activePresetId: id,
          activeFolderId: targetFolderId,
        })
      },

      loadPreset: (id) => {
        const s = get()
        const preset = s.presets.find((p) => p.id === id)
        if (!preset) return
        const landingPos: [number, number, number] | null =
          preset.trajectory.landingPosition
            ? [preset.trajectory.landingPosition[0], 0, preset.trajectory.landingPosition[1]]
            : null
        const folders = ensureUnsortedFolder(s.folders)
        const ownerFolder = folders.find((f) => f.presetIds.includes(id))
        set({
          setterPosition: preset.setterPosition,
          setter: normalizeSetter(preset.setter),
          net: { ...preset.net },
          trajectoryDraft: {
            landingPosition: landingPos,
            peakHeight: preset.trajectory.peakHeight,
            contactProgress: preset.trajectory.contactProgress ?? defaultTrajectory.contactProgress,
            committed: !!landingPos,
          },
          activePresetId: id,
          activeFolderId: ownerFolder?.id ?? UNSORTED_FOLDER_ID,
        })
      },

      deletePreset: (id) => {
        const s = get()
        const updatedPresets = s.presets.filter((p) => p.id !== id)
        const updatedFolders = ensureUnsortedFolder(s.folders).map((f) => ({
          ...f,
          presetIds: f.presetIds.filter((pid) => pid !== id),
        }))
        savePresetsToStorage(updatedPresets)
        const wasActive = s.activePresetId === id
        set({
          presets: updatedPresets,
          folders: updatedFolders,
          ...(wasActive ? { activePresetId: null } : {}),
        })
      },

      renamePreset: (id, name) => {
        const updatedPresets = get().presets.map((preset) =>
          preset.id === id ? { ...preset, name } : preset
        )
        savePresetsToStorage(updatedPresets)
        set({ presets: updatedPresets })
      },

      importPresets: (json) => {
        const { presets: incoming, folders: incomingFolders, error } = parseImportedPresets(json)
        if (error) throw new Error(error)
        const s = get()
        const existing = s.presets
        const existingIds = new Set(existing.map((p) => p.id))
        const merged = [...existing, ...incoming.filter((p) => !existingIds.has(p.id))]
        savePresetsToStorage(merged)

        const folderIds = new Set(s.folders.map((folder) => folder.id))
        const mergedFolders = incomingFolders
          ? [
              ...s.folders,
              ...incomingFolders
                .filter((folder) => folder.id !== UNSORTED_FOLDER_ID && !folderIds.has(folder.id))
                .map((folder) => ({
                  ...folder,
                  presetIds: folder.presetIds.filter((id) => merged.some((preset) => preset.id === id)),
                })),
            ]
          : s.folders

        set({ presets: merged, folders: ensureUnsortedFolder(mergedFolders) })
      },

      exportPresets: () => {
        const s = get()
        exportPresetsToFile(s.presets, ensureUnsortedFolder(s.folders))
      },

      createFolder: (name) => {
        const id = Date.now().toString(36) + '_f'
        set((s) => ({
          folders: [...ensureUnsortedFolder(s.folders), { id, name, presetIds: [] }],
          activeFolderId: id,
          activePresetId: null,
        }))
      },

      deleteFolder: (id) => {
        if (id === UNSORTED_FOLDER_ID) return
        set((s) => ({
          folders: ensureUnsortedFolder(s.folders).filter((f) => f.id !== id),
          ...(s.activeFolderId === id ? { activeFolderId: null, activePresetId: null } : {}),
        }))
      },

      renameFolder: (id, name) => {
        if (id === UNSORTED_FOLDER_ID) return
        set((s) => ({
          folders: ensureUnsortedFolder(s.folders).map((f) => (f.id === id ? { ...f, name } : f)),
        }))
      },

      addPresetToFolder: (presetId, folderId) => {
        set((s) => ({
          folders: ensureUnsortedFolder(s.folders).map((f) =>
            f.id === folderId
              ? { ...f, presetIds: [...f.presetIds.filter((x) => x !== presetId), presetId] }
              : { ...f, presetIds: f.presetIds.filter((x) => x !== presetId) }
          ),
          activeFolderId: folderId,
          activePresetId: presetId,
        }))
      },

      setActiveFolderId: (id) => set({
        activeFolderId: id,
        activePresetId: null,
        trajectoryDraft: { ...defaultTrajectory },
      }),
    }),
    {
      name: 'volleyvision-store',
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<AppStore> | undefined
        return {
          ...current,
          ...persistedState,
          folders: ensureUnsortedFolder(persistedState?.folders ?? current.folders),
          setter: normalizeSetter(persistedState?.setter ?? current.setter),
          activeFolderId: persistedState?.activeFolderId === UNSORTED_FOLDER_ID
            ? null
            : (persistedState?.activeFolderId ?? current.activeFolderId),
        }
      },
      partialize: (s) => ({
        setter: s.setter,
        net: s.net,
        presets: s.presets,
        folders: s.folders,
        showOpponentCourt: s.showOpponentCourt,
        units: s.units,
      }),
    }
  )
)
