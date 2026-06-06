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

function pointAtProgress(points: [number, number, number][], progress: number): [number, number, number] | null {
  if (points.length === 0) return null
  const scaled = clamp(progress, 0, 1) * (points.length - 1)
  const lo = Math.floor(scaled)
  const hi = Math.min(points.length - 1, lo + 1)
  const t = scaled - lo
  const a = points[lo]
  const b = points[hi]
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

interface TrajectoryProps {
  onDragStart: () => void
  onDragEnd: () => void
  previewLanding?: [number, number, number] | null
}

export default function Trajectory({ onDragStart, onDragEnd, previewLanding }: TrajectoryProps) {
  const { camera, gl } = useThree()
  const setter = useStore((s) => s.setter)
  const setterPosition = useStore((s) => s.setterPosition)
  const net = useStore((s) => s.net)
  const draft = useStore((s) => s.trajectoryDraft)
  const setPeakHeight = useStore((s) => s.setPeakHeight)
  const setContactProgress = useStore((s) => s.setContactProgress)
  const commitTrajectory = useStore((s) => s.commitTrajectory)
  const [peakHovered, setPeakHovered] = useState(false)
  const [contactHovered, setContactHovered] = useState(false)

  // 3D peak drag
  const isDragging = useRef(false)
  const isContactDragging = useRef(false)
  const dragPlane = useRef(new THREE.Plane())
  const hitPoint = useRef(new THREE.Vector3())
  const peakRaycaster = useRef(new THREE.Raycaster())
  const contactRaycaster = useRef(new THREE.Raycaster())

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

  const contactPoint = useMemo(
    () => pointAtProgress(points, draft.contactProgress),
    [points, draft.contactProgress]
  )

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
  const handleColor = '#22c55e'
  const arcWidth = isPreview ? 2 : 4
  const arcOpacity = isPreview ? 0.5 : 1
  const noRay = () => {}

  const handlePeakPointerDown = (e: any) => {
    e.stopPropagation()
    isDragging.current = true
    if (peakPoint) {
      const peakPos = new THREE.Vector3(peakPoint[0], peakPoint[1], peakPoint[2])
      const camDir = new THREE.Vector3()
      camera.getWorldDirection(camDir)
      dragPlane.current.setFromNormalAndCoplanarPoint(camDir, peakPos)
    }
    onDragStart()
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
    onDragEnd()
    commitTrajectory()
  }

  const handlePeakPointerCancel = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    isDragging.current = false
    document.body.style.cursor = 'auto'
    onDragEnd()
  }

  const updateContactFromPointer = (e: any) => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1
    contactRaycaster.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

    let bestIndex = 0
    let bestDistance = Infinity
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const distance = contactRaycaster.current.ray.distanceSqToPoint(new THREE.Vector3(p[0], p[1], p[2]))
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }

    setContactProgress(bestIndex / Math.max(1, points.length - 1))
  }

  const handleContactPointerDown = (e: any) => {
    e.stopPropagation()
    isContactDragging.current = true
    setContactHovered(true)
    document.body.style.cursor = 'grabbing'
    updateContactFromPointer(e)
    onDragStart()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleContactPointerMove = (e: any) => {
    if (!isContactDragging.current) return
    e.stopPropagation()
    updateContactFromPointer(e)
  }

  const handleContactPointerUp = (e: any) => {
    if (!isContactDragging.current) return
    e.stopPropagation()
    isContactDragging.current = false
    document.body.style.cursor = contactHovered ? 'grab' : 'auto'
    onDragEnd()
    commitTrajectory()
  }

  const handleContactPointerCancel = (e: any) => {
    if (!isContactDragging.current) return
    e.stopPropagation()
    isContactDragging.current = false
    document.body.style.cursor = 'auto'
    onDragEnd()
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

      {/* Intended contact marker - committed arc only */}
      {!isPreview && contactPoint && (
        <>
          <Line
            points={[
              [contactPoint[0], contactPoint[1], contactPoint[2]],
              [contactPoint[0], 0.003, contactPoint[2]],
            ]}
            color={handleColor}
            lineWidth={1}
            dashed
            dashSize={0.25}
            gapSize={0.15}
            transparent
            opacity={contactHovered ? 0.5 : 0.32}
          />
          <mesh position={[contactPoint[0], 0.007, contactPoint[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[contactHovered ? 0.15 : 0.12, 32]} />
            <meshBasicMaterial color={handleColor} transparent opacity={contactHovered ? 0.65 : 0.45} depthWrite={false} />
          </mesh>
          <group position={[contactPoint[0], contactPoint[1], contactPoint[2]]}>
            <mesh
              onPointerEnter={(e) => { e.stopPropagation(); setContactHovered(true); document.body.style.cursor = 'grab' }}
              onPointerLeave={(e) => { e.stopPropagation(); if (!isContactDragging.current) { setContactHovered(false); document.body.style.cursor = 'auto' } }}
              onPointerDown={handleContactPointerDown}
              onPointerMove={handleContactPointerMove}
              onPointerUp={handleContactPointerUp}
              onPointerCancel={handleContactPointerCancel}
              onLostPointerCapture={handleContactPointerCancel}
            >
              <sphereGeometry args={[0.16, 16, 16]} />
              <meshBasicMaterial color={handleColor} transparent opacity={contactHovered ? 0.12 : 0} depthWrite={false} />
            </mesh>
            {contactHovered && (
              <mesh raycast={noRay}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={handleColor} transparent opacity={0.28} depthWrite={false} />
              </mesh>
            )}
            <mesh raycast={noRay}>
              <sphereGeometry args={[contactHovered ? 0.125 : 0.11, 16, 16]} />
              <meshStandardMaterial color={handleColor} emissive={handleColor} emissiveIntensity={contactHovered ? 0.6 : 0.25} />
            </mesh>
          </group>
        </>
      )}

      {/* Peak height handle - committed arc only */}
      {!isPreview && peakPoint && (
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
            <capsuleGeometry args={[0.08, 0.38, 8, 16]} />
            <meshBasicMaterial color={handleColor} transparent opacity={peakHovered ? 0.10 : 0} depthWrite={false} />
          </mesh>
          {peakHovered && (
            <mesh raycast={noRay}>
              <capsuleGeometry args={[0.09, 0.42, 8, 16]} />
              <meshBasicMaterial color={handleColor} transparent opacity={0.26} depthWrite={false} />
            </mesh>
          )}
          <mesh raycast={noRay}>
            <capsuleGeometry args={[peakHovered ? 0.036 : 0.03, peakHovered ? 0.36 : 0.32, 8, 16]} />
            <meshStandardMaterial
              color={handleColor}
              emissive={handleColor}
              emissiveIntensity={peakHovered ? 0.6 : 0.25}
            />
          </mesh>
          <mesh position={[0, peakHovered ? 0.28 : 0.25, 0]} raycast={noRay}>
            <coneGeometry args={[peakHovered ? 0.085 : 0.075, 0.10, 16]} />
            <meshStandardMaterial color={handleColor} emissive={handleColor} emissiveIntensity={peakHovered ? 0.6 : 0.25} />
          </mesh>
          <mesh position={[0, peakHovered ? -0.28 : -0.25, 0]} rotation={[Math.PI, 0, 0]} raycast={noRay}>
            <coneGeometry args={[peakHovered ? 0.085 : 0.075, 0.10, 16]} />
            <meshStandardMaterial color={handleColor} emissive={handleColor} emissiveIntensity={peakHovered ? 0.6 : 0.25} />
          </mesh>
        </group>
      )}
    </group>
  )
}
