import { useMemo, useRef, useState, useEffect } from 'react'
import { useStore, UNSORTED_FOLDER_ID } from '../store/useStore'
import { fmtHeight } from '../lib/units'
import { useIsMobile } from '../lib/useIsMobile'
import { MIN_REACH_HEIGHT, MAX_REACH_HEIGHT } from '../lib/constants'

let _pos: { x: number; y: number } | null = null

const PANEL_W = 320

interface PresetPanelProps {
  onSelectItem?: () => void
}

export default function PresetPanel({ onSelectItem }: PresetPanelProps) {
  const isMobile = useIsMobile()
  const presets = useStore((s) => s.presets)
  const folders = useStore((s) => s.folders)
  const units = useStore((s) => s.units)
  const activePresetId = useStore((s) => s.activePresetId)
  const activeFolderId = useStore((s) => s.activeFolderId)
  const loadPreset = useStore((s) => s.loadPreset)
  const deletePreset = useStore((s) => s.deletePreset)
  const renamePreset = useStore((s) => s.renamePreset)
  const createFolder = useStore((s) => s.createFolder)
  const deleteFolder = useStore((s) => s.deleteFolder)
  const renameFolder = useStore((s) => s.renameFolder)
  const updateFolderReach = useStore((s) => s.updateFolderReach)
  const addPresetToFolder = useStore((s) => s.addPresetToFolder)
  const setActiveFolderId = useStore((s) => s.setActiveFolderId)
  const setPresetsOpen = useStore((s) => s.setPresetsOpen)
  const topPanel = useStore((s) => s.topPanel)

  const [folderName, setFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [draggedPresetId, setDraggedPresetId] = useState<string | null>(null)
  const [reachDrafts, setReachDrafts] = useState<Record<string, string>>({})

  const [pos, setPos] = useState<{ x: number; y: number }>(() =>
    _pos ?? { x: Math.max(16, window.innerWidth - PANEL_W * 2 - 32), y: 16 }
  )

  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const updatePos = (newPos: { x: number; y: number }) => {
    const clamped = {
      x: Math.min(Math.max(16, newPos.x), Math.max(16, window.innerWidth - PANEL_W - 16)),
      y: Math.min(Math.max(16, newPos.y), Math.max(16, window.innerHeight - 120)),
    }
    _pos = clamped
    setPos(clamped)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      updatePos({
        x: Math.max(0, dragStart.current.px + e.clientX - dragStart.current.mx),
        y: Math.max(0, dragStart.current.py + e.clientY - dragStart.current.my),
      })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    const onResize = () => updatePos(_pos ?? pos)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const assignedToCustomFolder = useMemo(
    () => new Set(
      folders
        .filter((folder) => folder.id !== UNSORTED_FOLDER_ID)
        .flatMap((folder) => folder.presetIds)
    ),
    [folders]
  )

  const presetsByFolder = useMemo(() => {
    return folders.map((folder) => {
      const ids = new Set(folder.presetIds)
      if (folder.id === UNSORTED_FOLDER_ID) {
        presets.forEach((preset) => {
          if (!assignedToCustomFolder.has(preset.id)) ids.add(preset.id)
        })
      }

      return {
        folder,
        presets: presets.filter((preset) => ids.has(preset.id)),
      }
    })
  }, [assignedToCustomFolder, folders, presets])

  const handleCreateFolder = () => {
    const name = folderName.trim()
    if (!name) return
    createFolder(name)
    setFolderName('')
  }

  const commitFolderName = (folderId: string) => {
    const name = editText.trim()
    if (name) renameFolder(folderId, name)
    setEditingFolderId(null)
    setEditText('')
  }

  const commitPresetName = (presetId: string) => {
    const name = editText.trim()
    if (name) renamePreset(presetId, name)
    setEditingPresetId(null)
    setEditText('')
  }

  const commitFolderReach = (folderId: string) => {
    const raw = reachDrafts[folderId]
    if (raw === undefined) return
    const trimmed = raw.trim()
    if (trimmed === '') {
      updateFolderReach(folderId, null)
    } else {
      const value = Number(trimmed)
      if (Number.isFinite(value)) {
        updateFolderReach(folderId, units === 'metric' ? value / 100 : value / 39.3701)
      }
    }
    setReachDrafts((drafts) => {
      const next = { ...drafts }
      delete next[folderId]
      return next
    })
  }

  return (
    <div
      className={`fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl select-none flex flex-col ${
        isMobile
          ? `left-2 right-2 top-20 bottom-24 rounded-xl overflow-hidden ${topPanel === 'presets' ? 'z-40' : 'z-30'}`
          : 'z-30 rounded-xl max-h-[76vh]'
      }`}
      style={isMobile ? undefined : { left: pos.x, top: pos.y, width: PANEL_W }}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'}`}
        onMouseDown={(e) => {
          if (isMobile) return
          dragging.current = true
          dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
        }}
      >
        <span className="font-semibold text-sm text-gray-900 dark:text-white">Presets & Player Folders</span>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500 text-sm font-semibold leading-none text-white hover:bg-red-600 transition-colors"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setPresetsOpen(false)}
          aria-label="Close presets"
        >
          x
        </button>
      </div>

      <div className={`${isMobile ? 'flex-1 min-h-0 p-3' : 'p-4'} flex flex-col gap-3 overflow-hidden`}>
        <div className="flex gap-2">
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
            placeholder="New player folder"
            className="min-w-0 flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleCreateFolder}
            className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium"
          >
            Add
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto flex flex-col gap-2 pr-1">
          {presetsByFolder.map(({ folder, presets: folderPresets }) => {
            const isFolderSelected = folder.id === activeFolderId && !activePresetId
            const isFolderExpanded = folder.id === activeFolderId
            const canDeleteFolder = folder.id !== UNSORTED_FOLDER_ID
            const storedReachValue = typeof folder.maxReachM === 'number'
              ? units === 'metric'
                ? String(Math.round(folder.maxReachM * 100))
                : String(Math.round(folder.maxReachM * 39.3701 * 10) / 10)
              : ''
            const reachValue = reachDrafts[folder.id] ?? storedReachValue

            return (
              <div key={folder.id} className="flex flex-col gap-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelectItem?.()
                    setActiveFolderId(isFolderSelected ? null : folder.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    onSelectItem?.()
                    setActiveFolderId(isFolderSelected ? null : folder.id)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const presetId = draggedPresetId ?? e.dataTransfer.getData('text/plain')
                    if (presetId) addPresetToFolder(presetId, folder.id)
                    setDraggedPresetId(null)
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                    isFolderSelected
                      ? 'bg-amber-50 dark:bg-amber-900/25 border-amber-400 dark:border-amber-600'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {editingFolderId === folder.id ? (
                    <input
                      value={editText}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => commitFolderName(folder.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitFolderName(folder.id)
                        if (e.key === 'Escape') { setEditingFolderId(null); setEditText('') }
                      }}
                      className="min-w-0 flex-1 px-2 py-1 text-sm rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-semibold ${isFolderSelected ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>
                        {folder.name}
                        {folder.id === UNSORTED_FOLDER_ID && (
                          <span className="ml-1 text-xs font-normal text-gray-400">Select player folder for simultaneous view</span>
                        )}
                      </div>
                      <label
                        className="mt-1 flex items-center gap-2 text-xs text-gray-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="flex-shrink-0">Max Reach</span>
                        <input
                          type="number"
                          min={units === 'metric' ? MIN_REACH_HEIGHT * 100 : Math.round(MIN_REACH_HEIGHT * 39.3701 * 10) / 10}
                          max={units === 'metric' ? MAX_REACH_HEIGHT * 100 : Math.round(MAX_REACH_HEIGHT * 39.3701 * 10) / 10}
                          step={units === 'metric' ? 1 : 0.5}
                          value={reachValue}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onChange={(e) => setReachDrafts((drafts) => ({ ...drafts, [folder.id]: e.target.value }))}
                          onBlur={() => commitFolderReach(folder.id)}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') e.currentTarget.blur()
                            if (e.key === 'Escape') {
                              setReachDrafts((drafts) => {
                                const next = { ...drafts }
                                delete next[folder.id]
                                return next
                              })
                              e.currentTarget.blur()
                            }
                          }}
                          placeholder="-"
                          className="w-16 rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                        />
                        <span>{units === 'metric' ? 'cm' : 'in'}</span>
                      </label>
                    </div>
                  )}
                  {isFolderSelected && canDeleteFolder && (
                    <span className="flex items-center gap-1.5">
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingFolderId(folder.id)
                          setEditText(folder.name)
                        }}
                        className="rounded-md bg-blue-500 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                      >
                        Rename
                      </span>
                      <span
                        onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id) }}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500 text-sm font-semibold leading-none text-white hover:bg-red-600 transition-colors"
                        aria-label="Delete player folder"
                      >
                        x
                      </span>
                    </span>
                  )}
                </div>

                {isFolderExpanded && (
                  <div className="ml-3 border-l border-gray-200 dark:border-gray-700 pl-3 flex flex-col gap-1.5">
                    {folderPresets.length === 0 && (
                      <p className="text-sm text-gray-400 py-3">No presets in this player folder.</p>
                    )}
                    {folderPresets.map((preset) => {
                      const isActive = preset.id === activePresetId
                      return (
                        <div
                          key={preset.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedPresetId(preset.id)
                            e.dataTransfer.setData('text/plain', preset.id)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={() => setDraggedPresetId(null)}
                          onClick={() => {
                            onSelectItem?.()
                            if (isActive) {
                              setActiveFolderId(null)
                            } else {
                              loadPreset(preset.id)
                            }
                          }}
                          className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-amber-50 dark:bg-amber-900/25 border-amber-400 dark:border-amber-600'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              {editingPresetId === preset.id ? (
                                <input
                                  value={editText}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onBlur={() => commitPresetName(preset.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitPresetName(preset.id)
                                    if (e.key === 'Escape') { setEditingPresetId(null); setEditText('') }
                                  }}
                                  className="w-full px-2 py-1 text-sm rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                                />
                              ) : (
                                <div className={`font-medium text-sm truncate ${isActive ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>
                                  {preset.name}
                                </div>
                              )}
                              <div className="text-xs text-gray-400">
                                {preset.setter.jumpSet ? 'Jump set' : 'Standing'} / {fmtHeight(preset.setter.heightM, units)}
                              </div>
                            </div>
                            {isActive && (
                              <div className="flex flex-shrink-0 items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingPresetId(preset.id)
                                    setEditText(preset.name)
                                  }}
                                  className="rounded-md bg-blue-500 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deletePreset(preset.id) }}
                                  className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500 text-sm font-semibold leading-none text-white hover:bg-red-600 transition-colors"
                                  aria-label="Delete preset"
                                >
                                  x
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
