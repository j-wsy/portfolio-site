import { useMemo, useRef, useState, useEffect } from 'react'
import { useStore, UNSORTED_FOLDER_ID } from '../store/useStore'
import { fmtHeight } from '../lib/units'
import { useIsMobile } from '../lib/useIsMobile'

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
  const importPresets = useStore((s) => s.importPresets)
  const exportPresets = useStore((s) => s.exportPresets)
  const createFolder = useStore((s) => s.createFolder)
  const deleteFolder = useStore((s) => s.deleteFolder)
  const renameFolder = useStore((s) => s.renameFolder)
  const addPresetToFolder = useStore((s) => s.addPresetToFolder)
  const setActiveFolderId = useStore((s) => s.setActiveFolderId)
  const setPresetsOpen = useStore((s) => s.setPresetsOpen)
  const settingsOpen = useStore((s) => s.settingsOpen)

  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [draggedPresetId, setDraggedPresetId] = useState<string | null>(null)

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
  }, [pos])

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

  return (
    <div
      className={`fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl z-30 select-none flex flex-col ${
        isMobile
          ? `left-2 right-2 ${settingsOpen ? 'top-24 max-h-[28vh]' : 'top-24 max-h-[56vh]'} rounded-xl overflow-hidden`
          : 'rounded-xl max-h-[76vh]'
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
        <span className="font-semibold text-sm text-gray-900 dark:text-white">Presets</span>
        <button
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setPresetsOpen(false)}
        >
          x
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 overflow-hidden">
        <div className="flex gap-2">
          <button
            onClick={exportPresets}
            className="flex-1 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Export all
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Import
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        <div className="flex gap-2">
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
            placeholder="New folder"
            className="min-w-0 flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleCreateFolder}
            className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium"
          >
            Add
          </button>
        </div>

        {importError && (
          <div className="text-xs text-red-500 p-2 bg-red-50 dark:bg-red-950 rounded-lg">
            {importError}
          </div>
        )}

        <div className="overflow-y-auto flex flex-col gap-2 pr-1">
          {presetsByFolder.map(({ folder, presets: folderPresets }) => {
            const isFolderActive = folder.id === activeFolderId
            const canDeleteFolder = folder.id !== UNSORTED_FOLDER_ID

            return (
              <div key={folder.id} className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    onSelectItem?.()
                    setActiveFolderId(folder.id)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const presetId = draggedPresetId ?? e.dataTransfer.getData('text/plain')
                    if (presetId) addPresetToFolder(presetId, folder.id)
                    setDraggedPresetId(null)
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                    isFolderActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600'
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
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        if (folder.id === UNSORTED_FOLDER_ID) return
                        setEditingFolderId(folder.id)
                        setEditText(folder.name)
                      }}
                      className={`flex-1 truncate text-sm font-semibold ${isFolderActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}
                    >
                      {folder.name}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{folderPresets.length}</span>
                  {canDeleteFolder && (
                    <span
                      onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id) }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Delete
                    </span>
                  )}
                </button>

                {isFolderActive && (
                  <div className="ml-3 border-l border-gray-200 dark:border-gray-700 pl-3 flex flex-col gap-1.5">
                    {folderPresets.length === 0 && (
                      <p className="text-sm text-gray-400 py-3">No presets in this folder.</p>
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
                            loadPreset(preset.id)
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
                                <div
                                  onDoubleClick={(e) => {
                                    e.stopPropagation()
                                    setEditingPresetId(preset.id)
                                    setEditText(preset.name)
                                  }}
                                  className={`font-medium text-sm truncate ${isActive ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}
                                >
                                  {preset.name}
                                </div>
                              )}
                              <div className="text-xs text-gray-400">
                                {preset.setter.jumpSet ? 'Jump set' : 'Standing'} / {fmtHeight(preset.setter.heightM, units)}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deletePreset(preset.id) }}
                              className="text-gray-400 hover:text-red-500 transition-colors text-sm flex-shrink-0"
                            >
                              x
                            </button>
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
