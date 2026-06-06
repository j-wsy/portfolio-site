import { useMemo, useRef } from 'react'
import { Line, Html } from '@react-three/drei'
import { useStore } from '../store/useStore'
import { computeArc, computeLaunchSpeed, checkNetClearance } from '../lib/projectile'
import { MAX_PEAK_HEIGHT } from '../lib/constants'

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

interface TrajectoryProps {
  onPeakDragStart: () => void
  onPeakDragEnd: () => void
}

export default function Trajectory({ onPeakDragStart, onPeakDragEnd }: TrajectoryProps) {
  const setter = useStore((s) => s.setter)
  const setterPosition = useStore((s) => s.setterPosition)
  const net = useStore((s) => s.net)
  const draft = useStore((s) => s.trajectoryDraft)
  const setPeakHeight = useStore((s) => s.setPeakHeight)
  const commitTrajectory = useStore((s) => s.commitTrajectory)

  const releaseHeight = setter.heightM * (setter.jumpSet ? 1.15 : 1.0) * 0.9

  const start: [number, number, number] = [
    setterPosition[0],
    releaseHeight,
    setterPosition[1],
  ]

  const points = useMemo(() => {
    if (!draft.landingPosition) return []
    return computeArc(start, draft.landingPosition, draft.peakHeight)
  }, [
    setterPosition[0], setterPosition[1],
    setter.heightM, setter.jumpSet,
    draft.landingPosition,
    draft.peakHeight,
  ])

  const clears = useMemo(
    () => checkNetClearance(points, net.heightM),
    [points, net.heightM]
  )

  const speed = useMemo(() => {
    if (!draft.landingPosition || points.length === 0) return 0
    return computeLaunchSpeed(start, draft.landingPosition, draft.peakHeight)
  }, [points, draft.landingPosition, draft.peakHeight])

  const peakPoint = useMemo(() => {
    if (points.length === 0) return null
    return points.reduce((best, p) => (p[1] > best[1] ? p : best), points[0])
  }, [points])

  const isDragging = useRef(false)
  const startClientY = useRef(0)
  const startPeakH = useRef(0)

  if (!draft.landingPosition || points.length === 0) return null

  const linePoints = points.map(([x, y, z]) => [x, y, z] as [number, number, number])
  const arcColor = clears ? '#22c55e' : '#ef4444'

  const handlePeakPointerDown = (e: any) => {
    e.stopPropagation()
    isDragging.current = true
    startClientY.current = e.clientY
    startPeakH.current = draft.peakHeight
    onPeakDragStart()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePeakPointerMove = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    const dy = startClientY.current - e.clientY  // up = positive
    const newH = clamp(startPeakH.current + dy * 0.025, releaseHeight + 0.1, MAX_PEAK_HEIGHT)
    setPeakHeight(newH)
  }

  const handlePeakPointerUp = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    isDragging.current = false
    onPeakDragEnd()
    commitTrajectory()
  }

  return (
    <group>
      <Line points={linePoints} color={arcColor} lineWidth={2} />

      {peakPoint && (
        <group position={[peakPoint[0], peakPoint[1], peakPoint[2]]}>
          <mesh
            onPointerDown={handlePeakPointerDown}
            onPointerMove={handlePeakPointerMove}
            onPointerUp={handlePeakPointerUp}
          >
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color={arcColor} />
          </mesh>
          <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
              {speed.toFixed(2)} m/s
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
