import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { computeArc, checkNetClearance } from '../lib/projectile'
import { MAX_PEAK_HEIGHT } from '../lib/constants'

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

interface TrajectoryProps {
  onPeakDragStart: () => void
  onPeakDragEnd: () => void
  previewLanding?: [number, number, number] | null
}

export default function Trajectory({ onPeakDragStart, onPeakDragEnd, previewLanding }: TrajectoryProps) {
  const { camera, gl } = useThree()
  const setter = useStore((s) => s.setter)
  const setterPosition = useStore((s) => s.setterPosition)
  const net = useStore((s) => s.net)
  const draft = useStore((s) => s.trajectoryDraft)
  const setPeakHeight = useStore((s) => s.setPeakHeight)
  const commitTrajectory = useStore((s) => s.commitTrajectory)
  const [peakHovered, setPeakHovered] = useState(false)

  // 3D peak drag
  const isDragging = useRef(false)
  const dragPlane = useRef(new THREE.Plane())
  const hitPoint = useRef(new THREE.Vector3())
  const peakRaycaster = useRef(new THREE.Raycaster())

  // Ghost ball animation
  const ballRef = useRef<THREE.Mesh>(null)
  const tRef = useRef(0)

  const isPreview = !!previewLanding && !draft.landingPosition
  const activeLanding = isPreview ? previewLanding! : draft.landingPosition

  const releaseHeight = setter.heightM * (setter.jumpSet ? 1.15 : 1.0) * 0.9

  const start: [number, number, number] = [
    setterPosition[0],
    releaseHeight,
    setterPosition[1],
  ]

  const points = useMemo(() => {
    if (!activeLanding) return []
    return computeArc(start, activeLanding, draft.peakHeight)
  }, [
    setterPosition[0], setterPosition[1],
    setter.heightM, setter.jumpSet,
    activeLanding,
    draft.peakHeight,
  ])

  const clears = useMemo(
    () => checkNetClearance(points, net.heightM),
    [points, net.heightM]
  )

  const peakPoint = useMemo(() => {
    if (points.length === 0) return null
    return points.reduce((best, p) => (p[1] > best[1] ? p : best), points[0])
  }, [points])

  // Animate ghost ball along arc (runs every frame; no-ops when arc is empty)
  useFrame((_, delta) => {
    if (!ballRef.current || points.length === 0) return
    tRef.current = (tRef.current + delta * 0.45) % 1
    const idx = Math.min(Math.floor(tRef.current * points.length), points.length - 1)
    const p = points[idx]
    ballRef.current.position.set(p[0], p[1], p[2])
  })

  if (!activeLanding || points.length === 0) return null

  const linePoints = points.map(([x, y, z]) => [x, y, z] as [number, number, number])

  const onOpponentSide = activeLanding[0] < 0
  const baseColor = onOpponentSide ? '#ef4444' : (clears ? '#22c55e' : '#f97316')
  const arcWidth = isPreview ? 2 : 4
  const arcOpacity = isPreview ? 0.5 : 1

  const handlePeakPointerDown = (e: any) => {
    e.stopPropagation()
    isDragging.current = true
    if (peakPoint) {
      const peakPos = new THREE.Vector3(peakPoint[0], peakPoint[1], peakPoint[2])
      const camDir = new THREE.Vector3()
      camera.getWorldDirection(camDir)
      dragPlane.current.setFromNormalAndCoplanarPoint(camDir, peakPos)
    }
    onPeakDragStart()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePeakPointerMove = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    const rect = gl.domElement.getBoundingClientRect()
    const ndcX =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
    const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1
    peakRaycaster.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
    if (peakRaycaster.current.ray.intersectPlane(dragPlane.current, hitPoint.current)) {
      setPeakHeight(clamp(hitPoint.current.y, releaseHeight + 0.1, MAX_PEAK_HEIGHT))
    }
  }

  const handlePeakPointerUp = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    isDragging.current = false
    document.body.style.cursor = peakHovered ? 'ns-resize' : 'auto'
    onPeakDragEnd()
    commitTrajectory()
  }

  const handlePeakPointerCancel = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    isDragging.current = false
    document.body.style.cursor = 'auto'
    onPeakDragEnd()
  }

  return (
    <group>
      {/* Arc line */}
      <Line points={linePoints} color={baseColor} lineWidth={arcWidth} transparent opacity={arcOpacity} />

      {/* Ghost ball animated along the arc - committed arc only */}
      {!isPreview && (
        <mesh ref={ballRef}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshBasicMaterial color="#f5e642" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}

      {/* Peak handle + dotted drop line - committed arc only */}
      {!isPreview && peakPoint && (
        <>
          {/* Thin dotted vertical line from peak down to court floor */}
          <Line
            points={[
              [peakPoint[0], peakPoint[1], peakPoint[2]],
              [peakPoint[0], 0.003, peakPoint[2]],
            ]}
            color={baseColor}
            lineWidth={1}
            dashed
            dashSize={0.25}
            gapSize={0.15}
            transparent
            opacity={0.35}
          />

          <mesh position={[peakPoint[0], 0.007, peakPoint[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.11, 32]} />
            <meshBasicMaterial color={baseColor} transparent opacity={0.5} depthWrite={false} />
          </mesh>

          {/* Peak handle sphere */}
          <group position={[peakPoint[0], peakPoint[1], peakPoint[2]]}>
            <mesh
              onPointerEnter={(e) => { e.stopPropagation(); setPeakHovered(true); document.body.style.cursor = 'ns-resize' }}
              onPointerLeave={(e) => { e.stopPropagation(); setPeakHovered(false); if (!isDragging.current) document.body.style.cursor = 'auto' }}
              onPointerDown={handlePeakPointerDown}
              onPointerMove={handlePeakPointerMove}
              onPointerUp={handlePeakPointerUp}
              onPointerCancel={handlePeakPointerCancel}
              onLostPointerCapture={handlePeakPointerCancel}
            >
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial
                color={baseColor}
                emissive={baseColor}
                emissiveIntensity={peakHovered ? 0.6 : 0.2}
              />
            </mesh>
          </group>
        </>
      )}
    </group>
  )
}
