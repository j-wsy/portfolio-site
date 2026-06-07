import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_NET_HEIGHT,
  DEFAULT_SETTER_HEIGHT,
  DEFAULT_PEAK_HEIGHT,
  MIN_SETTER_HEIGHT,
  MIN_REACH_HEIGHT,
  MAX_REACH_HEIGHT,
  SET_CONTACT_MULTIPLIER,
  SETTER_JUMP_HEIGHT,
} from '../lib/constants'
import { computeArc } from '../lib/projectile'
import { isHitzoneInAllyCourt, nearestProgressAtReach } from '../lib/hitzone'
import {
  loadPresetsFromStorage,
  savePresetsToStorage,
  exportDataToFile,
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
  maxReachM?: number | null
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
  lockHitzoneToReach: boolean
  hitzoneMustStayInCourt: boolean

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
  constrainLandingPosition: (pos: [number, number, number]) => [number, number, number]
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
  importData: (json: string) => void
  exportData: () => void
  createFolder: (name: string) => void
  deleteFolder: (id: string) => void
  renameFolder: (id: string, name: string) => void
  updateFolderReach: (id: string, maxReachM: number | null) => void
  addPresetToFolder: (presetId: string, folderId: string) => void
  setActiveFolderId: (id: string | null) => void
  toggleLockHitzoneToReach: () => void
  toggleHitzoneMustStayInCourt: () => void
}

function ensureUnsortedFolder(folders: Folder[]): Folder[] {
  const cleaned = folders.map((folder) =>
    folder.id === UNSORTED_FOLDER_ID
      ? { ...folder, name: UNSORTED_FOLDER_NAME }
      : folder
  )

  return cleaned.some((folder) => folder.id === UNSORTED_FOLDER_ID)
    ? cleaned
    : [{ id: UNSORTED_FOLDER_ID, name: UNSORTED_FOLDER_NAME, presetIds: [], maxReachM: null }, ...cleaned]
}

function hasPresetData(presets: Preset[] | undefined): presets is Preset[] {
  return Array.isArray(presets) && presets.length > 0
}

function hasFolderData(folders: Folder[] | undefined): folders is Folder[] {
  return Array.isArray(folders) && folders.some((folder) =>
    folder.id !== UNSORTED_FOLDER_ID || folder.presetIds.length > 0 || typeof folder.maxReachM === 'number'
  )
}

function normalizeSetter(setter: SetterConfig): SetterConfig {
  return {
    ...setter,
    heightM: Math.max(MIN_SETTER_HEIGHT, setter.heightM),
  }
}

function folderForState(s: AppStore): Folder | null {
  if (s.activeFolderId) return s.folders.find((folder) => folder.id === s.activeFolderId) ?? null
  const activePresetId = s.activePresetId
  if (!activePresetId) return null
  return s.folders.find((folder) => folder.presetIds.includes(activePresetId))
    ?? s.folders.find((folder) => folder.id === UNSORTED_FOLDER_ID)
    ?? null
}

function hitzoneProgressForLanding(s: AppStore, landing: [number, number, number]): number | null {
  const releaseHeight = s.setter.heightM * SET_CONTACT_MULTIPLIER + (s.setter.jumpSet ? SETTER_JUMP_HEIGHT : 0)
  const points = computeArc(
    [s.setterPosition[0], releaseHeight, s.setterPosition[1]],
    landing,
    s.trajectoryDraft.peakHeight
  )
  if (points.length === 0) return null

  const activeFolder = folderForState(s)
  const folderReach = activeFolder?.maxReachM
  const progress = s.lockHitzoneToReach && typeof folderReach === 'number'
    ? nearestProgressAtReach(points, s.trajectoryDraft.contactProgress, folderReach, false)
    : s.trajectoryDraft.contactProgress
  if (progress === null) return null
  return isHitzoneInAllyCourt(points, progress) ? progress : null
}

function constrainLandingToHitzoneCourt(s: AppStore, candidate: [number, number, number]): [number, number, number] {
  if (!s.hitzoneMustStayInCourt) return candidate
  if (hitzoneProgressForLanding(s, candidate) !== null) return candidate

  const current = s.trajectoryDraft.landingPosition
  const fallback: [number, number, number] =
    current && hitzoneProgressForLanding(s, current) !== null
      ? current
      : [Math.max(candidate[0], 0.1), candidate[1], candidate[2]]

  if (hitzoneProgressForLanding(s, fallback) === null) return fallback

  let lo = fallback
  let hi = candidate
  for (let i = 0; i < 16; i++) {
    const mid: [number, number, number] = [
      (lo[0] + hi[0]) / 2,
      0,
      (lo[2] + hi[2]) / 2,
    ]
    if (hitzoneProgressForLanding(s, mid) !== null) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return lo
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
      lockHitzoneToReach: true,
      hitzoneMustStayInCourt: true,

      setterPosition: [1.5, -3],
      setter: { heightM: DEFAULT_SETTER_HEIGHT, jumpSet: true },
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
          trajectoryDraft: {
            ...s.trajectoryDraft,
            landingPosition: pos ? constrainLandingToHitzoneCourt(s, pos) : null,
            committed: false,
          },
        })),
      constrainLandingPosition: (pos) => constrainLandingToHitzoneCourt(get(), pos),
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
        if (!landingPosition) return
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
            landingPosition: [landingPosition[0], landingPosition[2]],
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
          ...(wasActive ? { activePresetId: null, activeFolderId: null, trajectoryDraft: { ...defaultTrajectory } } : {}),
        })
      },

      renamePreset: (id, name) => {
        const updatedPresets = get().presets.map((preset) =>
          preset.id === id ? { ...preset, name } : preset
        )
        savePresetsToStorage(updatedPresets)
        set({ presets: updatedPresets })
      },

      importData: (json) => {
        const { presets: incoming, folders: incomingFolders, settings, error } = parseImportedPresets(json)
        if (error) throw new Error(error)
        const s = get()
        const existing = s.presets
        const existingIds = new Set(existing.map((p) => p.id))
        const merged = [...existing, ...incoming.filter((p) => !existingIds.has(p.id))]
        savePresetsToStorage(merged)

        const validPresetIds = new Set(merged.map((preset) => preset.id))
        const incomingFoldersById = new Map(
          (incomingFolders ?? []).map((folder) => [
            folder.id,
            {
              ...folder,
              presetIds: folder.presetIds.filter((id) => validPresetIds.has(id)),
            },
          ])
        )
        const existingFolderIds = new Set(s.folders.map((folder) => folder.id))
        const mergedFolders = incomingFolders
          ? [
              ...s.folders.map((folder) => incomingFoldersById.get(folder.id) ?? folder),
              ...Array.from(incomingFoldersById.values()).filter((folder) => !existingFolderIds.has(folder.id)),
            ]
          : s.folders

        set({
          presets: merged,
          folders: ensureUnsortedFolder(mergedFolders),
          activePresetId: null,
          activeFolderId: null,
          trajectoryDraft: { ...defaultTrajectory },
          ...(settings?.units === 'metric' || settings?.units === 'imperial' ? { units: settings.units } : {}),
          ...(settings?.setter ? { setter: normalizeSetter(settings.setter) } : {}),
          ...(settings?.net ? { net: { ...settings.net } } : {}),
          ...(typeof settings?.showOpponentCourt === 'boolean' ? { showOpponentCourt: settings.showOpponentCourt } : {}),
          ...(typeof settings?.lockHitzoneToReach === 'boolean' ? { lockHitzoneToReach: settings.lockHitzoneToReach } : {}),
          ...(typeof settings?.hitzoneMustStayInCourt === 'boolean' ? { hitzoneMustStayInCourt: settings.hitzoneMustStayInCourt } : {}),
        })
      },

      exportData: () => {
        const s = get()
        exportDataToFile({
          appVersion: 'v6.2',
          presets: s.presets,
          folders: ensureUnsortedFolder(s.folders),
          settings: {
            units: s.units,
            setter: s.setter,
            net: s.net,
            showOpponentCourt: s.showOpponentCourt,
            lockHitzoneToReach: s.lockHitzoneToReach,
            hitzoneMustStayInCourt: s.hitzoneMustStayInCourt,
          },
        })
      },

      createFolder: (name) => {
        const id = Date.now().toString(36) + '_f'
        set((s) => ({
          folders: [...ensureUnsortedFolder(s.folders), { id, name, presetIds: [], maxReachM: null }],
          activeFolderId: id,
          activePresetId: null,
          trajectoryDraft: { ...defaultTrajectory },
        }))
      },

      deleteFolder: (id) => {
        if (id === UNSORTED_FOLDER_ID) return
        set((s) => ({
          folders: ensureUnsortedFolder(s.folders).filter((f) => f.id !== id),
          ...(s.activeFolderId === id ? { activeFolderId: null, activePresetId: null, trajectoryDraft: { ...defaultTrajectory } } : {}),
        }))
      },

      renameFolder: (id, name) => {
        if (id === UNSORTED_FOLDER_ID) return
        set((s) => ({
          folders: ensureUnsortedFolder(s.folders).map((f) => (f.id === id ? { ...f, name } : f)),
        }))
      },

      updateFolderReach: (id, maxReachM) => {
        const normalized = maxReachM === null
          ? null
          : Math.min(MAX_REACH_HEIGHT, Math.max(MIN_REACH_HEIGHT, maxReachM))
        set((s) => ({
          folders: ensureUnsortedFolder(s.folders).map((f) =>
            f.id === id ? { ...f, maxReachM: normalized } : f
          ),
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

      toggleLockHitzoneToReach: () =>
        set((s) => ({ lockHitzoneToReach: !s.lockHitzoneToReach })),
      toggleHitzoneMustStayInCourt: () =>
        set((s) => ({ hitzoneMustStayInCourt: !s.hitzoneMustStayInCourt })),
    }),
    {
      name: 'volleyvision-store',
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<AppStore> | undefined
        const presets = hasPresetData(persistedState?.presets) ? persistedState.presets : current.presets
        const folders = hasFolderData(persistedState?.folders) ? persistedState.folders : current.folders
        return {
          ...current,
          ...persistedState,
          presets,
          folders: ensureUnsortedFolder(folders),
          setter: normalizeSetter(persistedState?.setter ?? current.setter),
          lockHitzoneToReach: persistedState?.lockHitzoneToReach ?? current.lockHitzoneToReach,
          hitzoneMustStayInCourt: persistedState?.hitzoneMustStayInCourt ?? current.hitzoneMustStayInCourt,
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
        lockHitzoneToReach: s.lockHitzoneToReach,
        hitzoneMustStayInCourt: s.hitzoneMustStayInCourt,
      }),
    }
  )
)
