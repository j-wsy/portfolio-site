import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { UNSORTED_FOLDER_ID, useStore } from './store/useStore'
import { DEFAULT_PEAK_HEIGHT, SET_X_MIN, SET_X_MAX, SET_Z_MIN, SET_Z_MAX } from './lib/constants'
import { useIsMobile } from './lib/useIsMobile'

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
const VISITED_KEY = 'volleyvision-has-opened'

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function App() {
  const settingsOpen   = useStore((s) => s.settingsOpen)
  const presetsOpen    = useStore((s) => s.presetsOpen)
  const instructionsOpen = useStore((s) => s.instructionsOpen)
  const setInstructionsOpen = useStore((s) => s.setInstructionsOpen)
  const topPanel = useStore((s) => s.topPanel)
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
  const isMobile = useIsMobile()

  const activePreset = presets.find((p) => p.id === activePresetId)
  const activePresetFolder = activePreset
    ? folders.find((folder) => folder.presetIds.includes(activePreset.id)) ?? folders.find((folder) => folder.id === UNSORTED_FOLDER_ID)
    : null
  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : null
  const selectionLabel = activePreset
    ? `${activePresetFolder?.name ?? 'General'}: ${activePreset.name}`
    : activeFolder
      ? `${activeFolder.name} - Simultaneous`
      : null

  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const [placingMode, setPlacingMode] = useState(false)
  const [editingNewSet, setEditingNewSet] = useState(false)
  const [unsavedNewSet, setUnsavedNewSet] = useState(false)
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null)
  const [interactionLock, setInteractionLock] = useState(0)
  const savedStateKeyRef = useRef<string | null>(null)

  const disableOrbit = useCallback(() => {
    setInteractionLock((count) => count + 1)
    setOrbitEnabled(false)
  }, [])
  const enableOrbit = useCallback(() => {
    setInteractionLock((count) => Math.max(0, count - 1))
    setOrbitEnabled(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('dark')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.inset = '0'
    document.body.style.width = '100%'

    if (window.localStorage.getItem(VISITED_KEY) !== 'true') {
      setInstructionsOpen(true)
      window.localStorage.setItem(VISITED_KEY, 'true')
    }
  }, [])

  const currentStateKey = useMemo(() => JSON.stringify({
    setterPosition,
    setter,
    net,
    landingPosition: trajectoryDraft.landingPosition,
    peakHeight: trajectoryDraft.peakHeight,
    contactProgress: trajectoryDraft.contactProgress,
  }), [landingPosition, net, setter, setterPosition, trajectoryDraft.landingPosition, trajectoryDraft.peakHeight, trajectoryDraft.contactProgress])

  useEffect(() => {
    savedStateKeyRef.current = activePresetId ? currentStateKey : null
    if (activePresetId) setUnsavedNewSet(false)
  }, [activePresetId])

  useEffect(() => {
    if (!activePresetId || !savedStateKeyRef.current || placingMode) return
    if (currentStateKey !== savedStateKeyRef.current) setUnsavedNewSet(true)
  }, [activePresetId, currentStateKey, placingMode])

  const setGhostFromPoint = useCallback((point: THREE.Vector3) => {
    const x = clamp(point.x, SET_X_MIN, SET_X_MAX)
    const z = clamp(point.z, SET_Z_MIN, SET_Z_MAX)
    setGhostPos([x, 0, z])
  }, [])

  const commitLandingFromEvent = useCallback((e: any) => {
    if (!placingMode || landingPosition) return
    if (!e.point) return
    const x = clamp(e.point.x, SET_X_MIN, SET_X_MAX)
    const z = clamp(e.point.z, SET_Z_MIN, SET_Z_MAX)
    setLandingPosition([x, 0, z])
    setGhostPos(null)
    setPlacingMode(false)
    setUnsavedNewSet(true)
  }, [placingMode, landingPosition, setLandingPosition])

  const handleCourtPointerMove = useCallback((e: any) => {
    if (!placingMode || landingPosition) return
    if (!e.point) return
    setGhostFromPoint(e.point)
  }, [placingMode, landingPosition, setGhostFromPoint])

  const handleCourtPointerUp = useCallback((e: any) => {
    commitLandingFromEvent(e)
  }, [commitLandingFromEvent])

  const handleCourtClick = useCallback((e: any) => {
    commitLandingFromEvent(e)
  }, [commitLandingFromEvent])

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
  const controlsEnabled = orbitEnabled && interactionLock === 0 && !placingMode

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden">
      {isMobile ? (
        <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none select-none">
          <div className="flex flex-shrink-0 items-baseline gap-2">
            <span className="text-xl font-semibold text-white/90 tracking-wide">VolleyVision</span>
            <span className="text-xl font-medium text-white/45">v5</span>
          </div>
          {selectionLabel && (
            <div className="mt-1 max-w-full text-left text-base font-semibold leading-tight text-white/80">
              {selectionLabel}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="absolute top-4 left-5 z-10 pointer-events-none select-none flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white/90 tracking-wide">VolleyVision</span>
            <span className="text-2xl font-medium text-white/45">v5</span>
          </div>

          {selectionLabel && (
            <div className="absolute top-5 left-0 right-0 flex justify-center pointer-events-none z-10">
              <div className="max-w-[45vw] truncate text-center text-2xl font-semibold text-white/80 tracking-wide">
                {selectionLabel}
              </div>
            </div>
          )}
        </>
      )}

      <Canvas
        camera={isMobile ? { position: [18, 11, 0], fov: 58 } : { position: [12, 8, 0], fov: 50 }}
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
          onPointerUp={handleCourtPointerUp}
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
            onDragStart={disableOrbit}
            onDragEnd={enableOrbit}
            previewLanding={placingMode && !landingPosition ? ghostPos : null}
          />
        )}
        <OrbitControls
          key={controlsEnabled ? 'controls-on' : 'controls-off'}
          enabled={controlsEnabled}
          mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          minPolarAngle={Math.PI / 18}
          maxPolarAngle={(Math.PI * 85) / 180}
          minDistance={4}
          maxDistance={34}
          target={[0, 0, 0]}
        />
      </Canvas>

      {settingsOpen && <SettingsPanel />}
      {presetsOpen  && <PresetPanel onSelectItem={cancelCreationFlow} />}
      {instructionsOpen && (
        <div
          className={`fixed bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/70 dark:border-white/10 shadow-2xl text-gray-900 dark:text-white ${
            isMobile
              ? `left-2 right-2 top-24 max-h-[56vh] rounded-xl overflow-hidden ${topPanel === 'instructions' ? 'z-40' : 'z-30'}`
              : 'z-30 right-6 bottom-32 w-[25rem] rounded-2xl'
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-200/70 dark:border-white/10 px-4 py-3">
            <span className="text-sm font-semibold">Instructions</span>
            <button
              onClick={() => setInstructionsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500 text-sm font-semibold leading-none text-white hover:bg-red-600 transition-colors"
              aria-label="Close instructions"
            >
              x
            </button>
          </div>
          <div className="max-h-[calc(50vh-3.25rem)] overflow-y-auto px-4 py-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
            <p className="font-semibold text-gray-900 dark:text-white">Set Visualizer - Visualize setting strategies for your team.</p>
            <p className="mt-3">Hi! This is a simple and free 3D indoor volleyball setting visualizer.</p>
            <ol className="mt-3 space-y-2">
              <li>1. Global settings: Configure net height, setter height, and standing/jump set.</li>
              <li>2. New Set: Drag to adjust the trajectory, arc height, and indicate the optimal contact point.</li>
              <li>3. Save: Save each set.</li>
              <li>4. Presets: Organize saved sets into folders (e.g. for each player/position) then select the folder to visualize them simultaneously.</li>
            </ol>
            <p className="mt-3">Thanks for checking this out!</p>
            <p>- Justin</p>
          </div>
        </div>
      )}

      <ActionBar
        placingMode={placingMode}
        unsavedNewSet={unsavedNewSet}
        onCreateNewSet={handleCreateNewSet}
        onSaveComplete={handleSaveComplete}
      />
    </div>
  )
}
