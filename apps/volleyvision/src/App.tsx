import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { UNSORTED_FOLDER_ID, useStore } from './store/useStore'
import {
  ALLY_X_MAX,
  ALLY_X_MIN,
  ALLY_Z_MAX,
  ALLY_Z_MIN,
  DEFAULT_PEAK_HEIGHT,
  MAX_PEAK_HEIGHT,
  SET_CONTACT_MULTIPLIER,
  SET_X_MAX,
  SET_X_MIN,
  SET_Z_MAX,
  SET_Z_MIN,
  SETTER_JUMP_HEIGHT,
} from './lib/constants'
import { useIsMobile } from './lib/useIsMobile'
import { fmtHeight } from './lib/units'
import { computeArc } from './lib/projectile'
import { pointAtProgress, progressCandidatesAtReach } from './lib/hitzone'

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
const INSTRUCTIONS_W = 400
const PANEL_MARGIN = 16
type AdjustmentAsset = 'meeple' | 'landing' | 'peak' | 'contact'

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
  const constrainLandingPosition = useStore((s) => s.constrainLandingPosition)
  const setPeakHeight      = useStore((s) => s.setPeakHeight)
  const setContactProgress = useStore((s) => s.setContactProgress)
  const setSetterPosition  = useStore((s) => s.setSetterPosition)
  const setActiveFolderId  = useStore((s) => s.setActiveFolderId)
  const landingPosition    = useStore((s) => s.trajectoryDraft.landingPosition)
  const setterPosition     = useStore((s) => s.setterPosition)
  const setter             = useStore((s) => s.setter)
  const net                = useStore((s) => s.net)
  const trajectoryDraft    = useStore((s) => s.trajectoryDraft)
  const units              = useStore((s) => s.units)
  const lockHitzoneToReach = useStore((s) => s.lockHitzoneToReach)
  const hitzoneMustStayInCourt = useStore((s) => s.hitzoneMustStayInCourt)
  const commitTrajectory = useStore((s) => s.commitTrajectory)
  const isMobile = useIsMobile()

  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const [placingMode, setPlacingMode] = useState(false)
  const [editingNewSet, setEditingNewSet] = useState(false)
  const [unsavedNewSet, setUnsavedNewSet] = useState(false)
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null)
  const [interactionLock, setInteractionLock] = useState(0)
  const [activeAdjustment, setActiveAdjustment] = useState<AdjustmentAsset | null>(null)
  const [instructionsPos, setInstructionsPos] = useState({ x: 16, y: 64 })
  const instructionsPosRef = useRef(instructionsPos)
  const savedStateKeyRef = useRef<string | null>(null)
  const instructionsDragging = useRef(false)
  const instructionsDragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const activePreset = presets.find((p) => p.id === activePresetId)
  const activePresetFolder = activePreset
    ? folders.find((folder) => folder.presetIds.includes(activePreset.id)) ?? folders.find((folder) => folder.id === UNSORTED_FOLDER_ID)
    : null
  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : null
  const creatingFolder = activeFolder ?? folders.find((folder) => folder.id === UNSORTED_FOLDER_ID) ?? null
  const selectionHeading = editingNewSet || placingMode
    ? `${creatingFolder?.name ?? 'General'} - CREATING NEW SET...`
    : activePreset
      ? `${activePresetFolder?.name ?? 'General'}: ${activePreset.name}`
      : activeFolder
        ? `${activeFolder.name} - Simultaneous`
        : null
  const selectionSubheading = editingNewSet || placingMode
    ? creatingFolder?.maxReachM
      ? `Max Reach: ${fmtHeight(creatingFolder.maxReachM, units)}`
      : 'Max Reach Not Defined'
    : null
  const folderReach = (activeFolder ?? activePresetFolder)?.maxReachM ?? null
  const releaseHeight = setter.heightM * SET_CONTACT_MULTIPLIER + (setter.jumpSet ? SETTER_JUMP_HEIGHT : 0)
  const activeArcPoints = useMemo(() => {
    if (!landingPosition) return []
    return computeArc([setterPosition[0], releaseHeight, setterPosition[1]], landingPosition, trajectoryDraft.peakHeight)
  }, [landingPosition, releaseHeight, setterPosition, trajectoryDraft.peakHeight])
  const activePeakPoint = useMemo(() => {
    if (activeArcPoints.length === 0) return null
    return activeArcPoints.reduce((best, point) => point[1] > best[1] ? point : best, activeArcPoints[0])
  }, [activeArcPoints])

  const disableOrbit = useCallback(() => {
    setInteractionLock((count) => count + 1)
    setOrbitEnabled(false)
  }, [])
  const enableOrbit = useCallback(() => {
    setInteractionLock((count) => Math.max(0, count - 1))
    setOrbitEnabled(true)
  }, [])

  const toggleAdjustment = useCallback((asset: AdjustmentAsset) => {
    setActiveAdjustment((current) => current === asset ? null : asset)
  }, [])

  const updateInstructionsPos = useCallback((nextPos: { x: number; y: number }) => {
    setInstructionsPos({
      x: Math.min(Math.max(PANEL_MARGIN, nextPos.x), Math.max(PANEL_MARGIN, window.innerWidth - INSTRUCTIONS_W - PANEL_MARGIN)),
      y: Math.min(Math.max(PANEL_MARGIN, nextPos.y), Math.max(PANEL_MARGIN, window.innerHeight - 120)),
    })
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

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!instructionsDragging.current) return
      updateInstructionsPos({
        x: instructionsDragStart.current.px + e.clientX - instructionsDragStart.current.mx,
        y: instructionsDragStart.current.py + e.clientY - instructionsDragStart.current.my,
      })
    }
    const onUp = () => { instructionsDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [updateInstructionsPos])

  useEffect(() => { instructionsPosRef.current = instructionsPos }, [instructionsPos])

  useEffect(() => {
    const onResize = () => updateInstructionsPos(instructionsPosRef.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [updateInstructionsPos])

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
    setGhostPos(constrainLandingPosition([x, 0, z]))
  }, [constrainLandingPosition])

  useEffect(() => {
    if (!placingMode || landingPosition) setGhostPos(null)
  }, [landingPosition, placingMode])

  const updateSelectedAssetFromEvent = useCallback((e: any) => {
    if (!activeAdjustment || placingMode) return false

    if (activeAdjustment === 'meeple') {
      if (!e.point) return false
      setSetterPosition([
        clamp(e.point.x, ALLY_X_MIN, ALLY_X_MAX),
        clamp(e.point.z, ALLY_Z_MIN, ALLY_Z_MAX),
      ])
      return true
    }

    if (activeAdjustment === 'landing') {
      if (!e.point || !landingPosition) return false
      setLandingPosition(constrainLandingPosition([
        clamp(e.point.x, SET_X_MIN, SET_X_MAX),
        0,
        clamp(e.point.z, SET_Z_MIN, SET_Z_MAX),
      ]))
      return true
    }

    if (activeAdjustment === 'peak') {
      if (!activePeakPoint || !e.ray || !e.camera) return false
      const cameraDirection = new THREE.Vector3()
      e.camera.getWorldDirection(cameraDirection)
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        cameraDirection,
        new THREE.Vector3(activePeakPoint[0], activePeakPoint[1], activePeakPoint[2])
      )
      const hitPoint = new THREE.Vector3()
      if (!e.ray.intersectPlane(plane, hitPoint)) return false
      setPeakHeight(clamp(hitPoint.y, releaseHeight + 0.1, MAX_PEAK_HEIGHT))
      return true
    }

    if (activeAdjustment === 'contact') {
      if (activeArcPoints.length === 0 || !e.ray) return false

      if (lockHitzoneToReach && typeof folderReach === 'number') {
        const candidates = progressCandidatesAtReach(activeArcPoints, folderReach, hitzoneMustStayInCourt)
        let bestProgress: number | null = null
        let bestDistance = Infinity
        candidates.forEach((progress) => {
          const point = pointAtProgress(activeArcPoints, progress)
          if (!point) return
          const distance = e.ray.distanceSqToPoint(new THREE.Vector3(point[0], point[1], point[2]))
          if (distance < bestDistance) {
            bestDistance = distance
            bestProgress = progress
          }
        })
        if (bestProgress === null) return false
        setContactProgress(bestProgress)
        return true
      }

      let bestProgress: number | null = null
      let bestDistance = Infinity
      activeArcPoints.forEach((point, index) => {
        const progress = index / Math.max(1, activeArcPoints.length - 1)
        if (progress < 0.02 || progress > 0.98) return
        if (hitzoneMustStayInCourt && point[0] < ALLY_X_MIN) return
        const distance = e.ray.distanceSqToPoint(new THREE.Vector3(point[0], point[1], point[2]))
        if (distance < bestDistance) {
          bestDistance = distance
          bestProgress = progress
        }
      })
      if (bestProgress === null) return false
      setContactProgress(bestProgress)
      return true
    }

    return false
  }, [
    activeAdjustment,
    activeArcPoints,
    activePeakPoint,
    constrainLandingPosition,
    folderReach,
    hitzoneMustStayInCourt,
    landingPosition,
    lockHitzoneToReach,
    placingMode,
    releaseHeight,
    setContactProgress,
    setLandingPosition,
    setPeakHeight,
    setSetterPosition,
  ])

  const commitLandingFromEvent = useCallback((e: any) => {
    if (!placingMode || landingPosition) return
    if (!e.point) return
    const x = clamp(e.point.x, SET_X_MIN, SET_X_MAX)
    const z = clamp(e.point.z, SET_Z_MIN, SET_Z_MAX)
    setLandingPosition(constrainLandingPosition([x, 0, z]))
    setGhostPos(null)
    setPlacingMode(false)
    setUnsavedNewSet(true)
  }, [placingMode, landingPosition, setLandingPosition])

  const handleCourtPointerMove = useCallback((e: any) => {
    if (activeAdjustment && !placingMode) {
      updateSelectedAssetFromEvent(e)
      return
    }
    if (!placingMode || landingPosition) return
    if (!e.point) return
    setGhostFromPoint(e.point)
  }, [activeAdjustment, landingPosition, placingMode, setGhostFromPoint, updateSelectedAssetFromEvent])

  const handleCourtPointerUp = useCallback((e: any) => {
    commitLandingFromEvent(e)
  }, [commitLandingFromEvent])

  const handleCourtClick = useCallback((e: any) => {
    if (activeAdjustment && !placingMode) {
      updateSelectedAssetFromEvent(e)
      if (activeAdjustment === 'peak' || activeAdjustment === 'contact') commitTrajectory()
      setActiveAdjustment(null)
      return
    }
    commitLandingFromEvent(e)
  }, [activeAdjustment, commitLandingFromEvent, commitTrajectory, placingMode, updateSelectedAssetFromEvent])

  const handleCreateNewSet = () => {
    if (placingMode) {
      setActiveAdjustment(null)
      setPlacingMode(false)
      setEditingNewSet(false)
      setUnsavedNewSet(false)
      setGhostPos(null)
      setLandingPosition(null)
      return
    }
    setActiveAdjustment(null)
    setActiveFolderId(activeFolderId)
    setLandingPosition(null)
    setPeakHeight(DEFAULT_PEAK_HEIGHT)
    setEditingNewSet(true)
    setUnsavedNewSet(false)
    setPlacingMode(true)
    setGhostPos(null)
  }

  const cancelCreationFlow = () => {
    setActiveAdjustment(null)
    setPlacingMode(false)
    setEditingNewSet(false)
    setUnsavedNewSet(false)
    setGhostPos(null)
    if (placingMode) setLandingPosition(null)
  }

  const handleSaveComplete = () => {
    setActiveAdjustment(null)
    setEditingNewSet(false)
    setUnsavedNewSet(false)
    savedStateKeyRef.current = currentStateKey
  }

  // Ball indicator: ghost while hovering, landing spot after placed
  const ballIndicatorPos = placingMode && !landingPosition
    ? ghostPos
    : (landingPosition as [number, number, number] | null)
  const assignedPresetIds = useMemo(() =>
    new Set(folders.filter((folder) => folder.id !== UNSORTED_FOLDER_ID).flatMap((folder) => folder.presetIds))
  , [folders])
  const activeFolderPresetCount = activeFolderId === UNSORTED_FOLDER_ID
    ? presets.filter((preset) => !assignedPresetIds.has(preset.id)).length
    : (activeFolder?.presetIds.length ?? 0)
  const folderPreviewActive = !!activeFolderId && activeFolderPresetCount > 0 && !activePresetId && !editingNewSet && !placingMode
  const showActiveSet = !folderPreviewActive
  const controlsEnabled = orbitEnabled && interactionLock === 0 && !placingMode && !activeAdjustment

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden">
      {isMobile ? (
        <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none select-none">
          <div className="flex flex-shrink-0 items-baseline gap-2">
            <span className="text-xl font-semibold text-white/90 tracking-wide">VolleyVision</span>
            <span className="text-xl font-medium text-white/45">v6.2</span>
          </div>
          {selectionHeading && (
            <div className="mt-1 max-w-full text-left leading-tight">
              <div className="text-base font-semibold text-white/80">
                {selectionHeading}
              </div>
              {selectionSubheading && (
                <div className="mt-0.5 text-xs font-normal text-white/55">
                  {selectionSubheading}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="absolute top-4 left-5 z-10 pointer-events-none select-none flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white/90 tracking-wide">VolleyVision</span>
            <span className="text-2xl font-medium text-white/45">v6.2</span>
          </div>

          {selectionHeading && (
            <div className="absolute top-5 left-0 right-0 flex justify-center pointer-events-none z-10">
              <div className="max-w-[45vw] text-center tracking-wide">
                <div className="truncate text-2xl font-semibold text-white/80">
                  {selectionHeading}
                </div>
                {selectionSubheading && (
                  <div className="mt-0.5 text-sm font-normal text-white/55">
                    {selectionSubheading}
                  </div>
                )}
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
            selected={activeAdjustment === 'meeple'}
            onAdjustmentToggle={() => toggleAdjustment('meeple')}
          />
        )}
        <FolderPreview enabled={folderPreviewActive} />
        {showActiveSet && ballIndicatorPos && (
          <Ball
            position={ballIndicatorPos}
            draggable={!!landingPosition && !placingMode}
            selected={activeAdjustment === 'landing'}
            onDragStart={disableOrbit}
            onDragEnd={enableOrbit}
            onAdjustmentToggle={() => toggleAdjustment('landing')}
          />
        )}
        {showActiveSet && (
          <Trajectory
            onDragStart={disableOrbit}
            onDragEnd={enableOrbit}
            previewLanding={placingMode && !landingPosition ? ghostPos : null}
            selectedAsset={activeAdjustment === 'peak' || activeAdjustment === 'contact' ? activeAdjustment : null}
            onAdjustmentToggle={toggleAdjustment}
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
              ? `left-2 right-2 top-20 bottom-24 flex flex-col rounded-xl overflow-hidden ${topPanel === 'instructions' ? 'z-40' : 'z-30'}`
              : 'z-30 rounded-2xl'
          }`}
          style={isMobile ? undefined : { left: instructionsPos.x, top: instructionsPos.y, width: INSTRUCTIONS_W }}
        >
          <div
            className={`flex items-center justify-between border-b border-gray-200/70 dark:border-white/10 px-4 py-3 ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'}`}
            onMouseDown={(e) => {
              if (isMobile) return
              instructionsDragging.current = true
              instructionsDragStart.current = { mx: e.clientX, my: e.clientY, px: instructionsPos.x, py: instructionsPos.y }
            }}
          >
            <span className="text-sm font-semibold">Instructions</span>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setInstructionsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500 text-sm font-semibold leading-none text-white hover:bg-red-600 transition-colors"
              aria-label="Close instructions"
            >
              x
            </button>
          </div>
          <div className={`${isMobile ? 'flex-1 min-h-0' : 'max-h-[calc(50vh-3.25rem)]'} overflow-y-auto px-4 py-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200`}>
            <p className="font-semibold text-gray-900 dark:text-white">Set Visualizer - Visualize setting strategies for your team.</p>
            <p className="mt-3">Hi! This is a simple and free 3D indoor volleyball setting visualizer.</p>
            <ol className="mt-3 space-y-2">
              <li>1. Global settings: Configure net height, setter height, and standing/jump set.</li>
              <li>2. New Set: Drag to adjust the trajectory, arc height, and indicate the optimal contact point.</li>
              <li>3. Save: Save each set.</li>
              <li>4. Presets: Organize saved sets into player folders, add Max Reach when helpful, then select the player folder to visualize them simultaneously.</li>
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
