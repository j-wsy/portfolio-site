import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { useStore } from './store/useStore'
import { OPP_X_MIN, OPP_X_MAX, OPP_Z_MIN, OPP_Z_MAX } from './lib/constants'

import Lights from './scene/Lights'
import Court from './scene/Court'
import Net from './scene/Net'
import Meeple from './scene/Meeple'
import Ball from './scene/Ball'
import Trajectory from './scene/Trajectory'

import Toolbar from './ui/Toolbar'
import SetterPanel from './ui/SetterPanel'
import NetPanel from './ui/NetPanel'
import PresetPanel from './ui/PresetPanel'

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function App() {
  const darkMode = useStore((s) => s.darkMode)
  const activePanel = useStore((s) => s.activePanel)
  const setActivePanel = useStore((s) => s.setActivePanel)
  const setLandingPosition = useStore((s) => s.setLandingPosition)
  const landingPosition = useStore((s) => s.trajectoryDraft.landingPosition)

  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const [placingMode, setPlacingMode] = useState(false)
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null)

  const disableOrbit = useCallback(() => setOrbitEnabled(false), [])
  const enableOrbit = useCallback(() => setOrbitEnabled(true), [])

  // sync dark class on mount and whenever darkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const handleCourtPointerMove = useCallback((e: any) => {
    if (!placingMode || landingPosition) return
    if (!e.point) return
    const x = clamp(e.point.x, OPP_X_MIN, OPP_X_MAX)
    const z = clamp(e.point.z, OPP_Z_MIN, OPP_Z_MAX)
    setGhostPos([x, 0, z])
  }, [placingMode, landingPosition])

  const handleCourtClick = useCallback((e: any) => {
    if (!placingMode || landingPosition) return
    if (!e.point) return
    const x = clamp(e.point.x, OPP_X_MIN, OPP_X_MAX)
    const z = clamp(e.point.z, OPP_Z_MIN, OPP_Z_MAX)
    setLandingPosition([x, 0, z])
    setGhostPos(null)
    setPlacingMode(false)
  }, [placingMode, landingPosition, setLandingPosition])

  const togglePlacing = () => {
    setPlacingMode((v) => !v)
    setGhostPos(null)
  }

  const sceneBackground = darkMode ? '#0f0f0f' : '#e8e8e8'

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      <Toolbar placingMode={placingMode} onTogglePlacing={togglePlacing} />

      <Canvas
        camera={{ position: [12, 8, 0], fov: 50 }}
        style={{ background: sceneBackground }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(sceneBackground))
        }}
      >
        <Lights />
        <Court
          onPointerMove={handleCourtPointerMove}
          onPointerDown={undefined}
          onPointerUp={undefined}
          onClick={handleCourtClick}
        />
        <Net />
        <Meeple
          onDragStart={disableOrbit}
          onDragEnd={enableOrbit}
        />
        {ghostPos && <Ball position={ghostPos} />}
        <Trajectory
          onPeakDragStart={disableOrbit}
          onPeakDragEnd={enableOrbit}
        />
        <OrbitControls
          enabled={orbitEnabled}
          minPolarAngle={Math.PI / 18}
          maxPolarAngle={(Math.PI * 85) / 180}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* panels need absolute positioning relative to the viewport container */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="pointer-events-auto">
          {activePanel === 'setter' && <SetterPanel />}
          {activePanel === 'net' && <NetPanel />}
          {activePanel === 'preset' && <PresetPanel />}
        </div>
      </div>

      {/* click outside panels to close — z-[5] stays below toolbar (z-10) and panels (z-20) */}
      {activePanel && (
        <div
          className="absolute inset-0 z-[5]"
          onClick={() => setActivePanel(null)}
        />
      )}
    </div>
  )
}
