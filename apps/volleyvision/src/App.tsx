import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { UNSORTED_FOLDER_ID, useStore } from './store/useStore'
import { DEFAULT_PEAK_HEIGHT, SET_X_MIN, SET_X_MAX, SET_Z_MIN, SET_Z_MAX } from './lib/constants'

import Lights from './scene/Lights'
import Court from './scene/Court'
import Net from './scene/Net'
import Meeple from './scene/Meeple'
import Ball from './scene/Ball'
import Trajectory from './scene/Trajectory'
import Horizon from './scene/Horizon'
import FolderPreview from './scene/FolderPreview'

import ActionBar from './ui/ActionBar'
import SettingsPanel from './ui/SettingsPanel'
import PresetPanel from './ui/PresetPanel'

const SKY = '#0f1a2e'

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function App() {
  const settingsOpen   = useStore((s) => s.settingsOpen)
  const presetsOpen    = useStore((s) => s.presetsOpen)
  const activePresetId = useStore((s) => s.activePresetId)
  const activeFolderId = useStore((s) => s.activeFolderId)
  const presets        = useStore((s) => s.presets)
  const folders        = useStore((s) => s.folders)
  const setLandingPosition = useStore((s) => s.setLandingPosition)
  const setPeakHeight      = useStore((s) => s.setPeakHeight)
  const setActiveFolderId  = useStore((s) => s.setActiveFolderId)
  const landingPosition    = useStore((s) => s.trajectoryDraft.landingPosition)
  const setterPosition     = useStore((s) => s.setterPosition)
  const setter             = useStore((s) => s.setter)
  const net                = useStore((s) => s.net)
  const trajectoryDraft    = useStore((s) => s.trajectoryDraft)

  const activePreset = presets.find((p) => p.id === activePresetId)
  const activeFolder = folders.find((f) => f.id === activeFolderId)
  const selectionFolderName = activeFolder?.name ?? 'Unsorted'

  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const [placingMode, setPlacingMode] = useState(false)
  const [editingNewSet, setEditingNewSet] = useState(false)
  const [unsavedNewSet, setUnsavedNewSet] = useState(false)
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null)
  const savedStateKeyRef = useRef<string | null>(null)

  const disableOrbit = useCallback(() => setOrbitEnabled(false), [])
  const enableOrbit  = useCallback(() => setOrbitEnabled(true),  [])

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const currentStateKey = useMemo(() => JSON.stringify({
    setterPosition,
    setter,
    net,
    landingPosition: trajectoryDraft.landingPosition,
    peakHeight: trajectoryDraft.peakHeight,
  }), [landingPosition, net, setter, setterPosition, trajectoryDraft.landingPosition, trajectoryDraft.peakHeight])

  useEffect(() => {
    savedStateKeyRef.current = activePresetId ? currentStateKey : null
    if (activePresetId) setUnsavedNewSet(false)
  }, [activePresetId])

  useEffect(() => {
    if (!activePresetId || !savedStateKeyRef.current || placingMode) return
    if (currentStateKey !== savedStateKeyRef.current) setUnsavedNewSet(true)
  }, [activePresetId, currentStateKey, placingMode])

  const handleCourtPointerMove = useCallback((e: any) => {
    if (!placingMode || landingPosition) return
    if (!e.point) return
    const x = clamp(e.point.x, SET_X_MIN, SET_X_MAX)
    const z = clamp(e.point.z, SET_Z_MIN, SET_Z_MAX)
    setGhostPos([x, 0, z])
  }, [placingMode, landingPosition])

  const handleCourtClick = useCallback((e: any) => {
    if (!placingMode || landingPosition) return
    if (!e.point) return
    const x = clamp(e.point.x, SET_X_MIN, SET_X_MAX)
    const z = clamp(e.point.z, SET_Z_MIN, SET_Z_MAX)
    setLandingPosition([x, 0, z])
    setGhostPos(null)
    setPlacingMode(false)
    setUnsavedNewSet(true)
  }, [placingMode, landingPosition, setLandingPosition])

  const handleCreateNewSet = () => {
    if (placingMode) {
      setPlacingMode(false)
      setEditingNewSet(false)
      setUnsavedNewSet(false)
      setGhostPos(null)
      setLandingPosition(null)
      return
    }
    setActiveFolderId(activeFolderId)
    setLandingPosition(null)
    setPeakHeight(DEFAULT_PEAK_HEIGHT)
    setEditingNewSet(true)
    setUnsavedNewSet(false)
    setPlacingMode(true)
    setGhostPos(null)
  }

  const cancelCreationFlow = () => {
    setPlacingMode(false)
    setEditingNewSet(false)
    setUnsavedNewSet(false)
    setGhostPos(null)
    if (placingMode) setLandingPosition(null)
  }

  const handleSaveComplete = () => {
    setEditingNewSet(false)
    setUnsavedNewSet(false)
    savedStateKeyRef.current = currentStateKey
  }

  // Ball indicator: ghost while hovering, landing spot after placed
  const ballIndicatorPos = ghostPos ?? (landingPosition as [number, number, number] | null)
  const assignedPresetIds = new Set(
    folders
      .filter((folder) => folder.id !== UNSORTED_FOLDER_ID)
      .flatMap((folder) => folder.presetIds)
  )
  const activeFolderPresetCount = activeFolderId === UNSORTED_FOLDER_ID
    ? presets.filter((preset) => !assignedPresetIds.has(preset.id)).length
    : (activeFolder?.presetIds.length ?? 0)
  const folderPreviewActive = !!activeFolderId && activeFolderPresetCount > 0 && !activePresetId && !editingNewSet && !placingMode
  const showActiveSet = !folderPreviewActive

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      <div className="absolute top-4 left-5 z-10 pointer-events-none select-none flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-white/90 tracking-wide">VolleyVision</span>
        <span className="text-sm font-medium text-white/45">v1</span>
      </div>

      {/* Current folder / preset selection */}
      <div className="absolute top-5 left-0 right-0 flex justify-center pointer-events-none z-10">
        <div className="text-center select-none">
          <div className="text-2xl font-semibold text-white/80 tracking-wide">
            {selectionFolderName}
          </div>
          {activePreset && (
            <div className="mt-0.5 text-base font-medium text-white/50">
              {activePreset.name}
            </div>
          )}
        </div>
      </div>

      <Canvas
        camera={{ position: [12, 8, 0], fov: 50 }}
        style={{ background: SKY }}
        onContextMenu={(e) => e.preventDefault()}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(SKY))
        }}
      >
        <Horizon />
        <Lights />
        <Court
          onPointerMove={handleCourtPointerMove}
          onClick={handleCourtClick}
        />
        <Net />
        {showActiveSet && (
          <Meeple
            onDragStart={disableOrbit}
            onDragEnd={enableOrbit}
          />
        )}
        <FolderPreview enabled={folderPreviewActive} />
        {showActiveSet && ballIndicatorPos && (
          <Ball
            position={ballIndicatorPos}
            draggable={!!landingPosition && !placingMode}
            onDragStart={disableOrbit}
            onDragEnd={enableOrbit}
          />
        )}
        {showActiveSet && (
          <Trajectory
            onPeakDragStart={disableOrbit}
            onPeakDragEnd={enableOrbit}
            previewLanding={placingMode && !landingPosition ? ghostPos : null}
          />
        )}
        <OrbitControls
          enabled={orbitEnabled}
          mouseButtons={{ LEFT: null as any, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
          minPolarAngle={Math.PI / 18}
          maxPolarAngle={(Math.PI * 85) / 180}
          target={[0, 0, 0]}
        />
      </Canvas>

      {settingsOpen && <SettingsPanel />}
      {presetsOpen  && <PresetPanel onSelectItem={cancelCreationFlow} />}

      <ActionBar
        placingMode={placingMode}
        unsavedNewSet={unsavedNewSet}
        onCreateNewSet={handleCreateNewSet}
        onSaveComplete={handleSaveComplete}
      />
    </div>
  )
}
