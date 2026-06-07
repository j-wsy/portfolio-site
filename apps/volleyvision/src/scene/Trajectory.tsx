import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Billboard, Line, Text } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { UNSORTED_FOLDER_ID, useStore } from '../store/useStore'
import { computeArc } from '../lib/projectile'
import { MAX_PEAK_HEIGHT, SET_CONTACT_MULTIPLIER, SETTER_JUMP_HEIGHT, ALLY_X_MIN } from '../lib/constants'
import { nearestProgressAtReach, pointAtProgress, progressCandidatesAtReach } from '../lib/hitzone'
import { fmtHeight } from '../lib/units'

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

interface TrajectoryProps {
  onDragStart: () => void
  onDragEnd: () => void
  previewLanding?: [number, number, number] | null
  selectedAsset?: 'peak' | 'contact' | null
  onAdjustmentToggle?: (asset: 'peak' | 'contact') => void
}

export default function Trajectory({ onDragStart, onDragEnd, previewLanding, selectedAsset = null, onAdjustmentToggle }: TrajectoryProps) {
  const { camera, gl } = useThree()
  const setter = useStore((s) => s.setter)
  const setterPosition = useStore((s) => s.setterPosition)
  const draft = useStore((s) => s.trajectoryDraft)
  const folders = useStore((s) => s.folders)
  const activeFolderId = useStore((s) => s.activeFolderId)
  const activePresetId = useStore((s) => s.activePresetId)
  const lockHitzoneToReach = useStore((s) => s.lockHitzoneToReach)
  const hitzoneMustStayInCourt = useStore((s) => s.hitzoneMustStayInCourt)
  const units = useStore((s) => s.units)
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
  const peakPointerStart = useRef({ x: 0, y: 0, moved: false })
  const contactPointerStart = useRef({ x: 0, y: 0, moved: false })

  // Ghost ball animation
  const ballRef = useRef<THREE.Mesh>(null)
  const tRef = useRef(0)

  const isPreview = !!previewLanding && !draft.landingPosition
  const activeLanding = isPreview ? previewLanding! : draft.landingPosition

  const activeFolder = useMemo(() => {
    if (activeFolderId) return folders.find((folder) => folder.id === activeFolderId) ?? null
    if (!activePresetId) return null
    return folders.find((folder) => folder.presetIds.includes(activePresetId))
      ?? folders.find((folder) => folder.id === UNSORTED_FOLDER_ID)
      ?? null
  }, [activeFolderId, activePresetId, folders])

  const folderReach = activeFolder?.maxReachM ?? null
  const contactLockedToReach = lockHitzoneToReach && typeof folderReach === 'number'

  const releaseHeight = setter.heightM * SET_CONTACT_MULTIPLIER + (setter.jumpSet ? SETTER_JUMP_HEIGHT : 0)

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

  const peakPoint = useMemo(() => {
    if (points.length === 0) return null
    return points.reduce((best, p) => (p[1] > best[1] ? p : best), points[0])
  }, [points])

  const contactPoint = useMemo(
    () => pointAtProgress(points, draft.contactProgress),
    [points, draft.contactProgress]
  )

  const nearestAllowedContactProgress = (targetProgress: number): number | null => {
    if (points.length === 0) return null
    if (contactLockedToReach) {
      return nearestProgressAtReach(points, targetProgress, folderReach ?? 0, hitzoneMustStayInCourt)
    }
    let bestProgress: number | null = null
    let bestDistance = Infinity
    for (let i = 0; i < points.length; i++) {
      const progress = i / Math.max(1, points.length - 1)
      const p = points[i]
      if (progress < 0.02 || progress > 0.98) continue
      if (hitzoneMustStayInCourt && p[0] < ALLY_X_MIN) continue
      const distance = Math.abs(progress - targetProgress)
      if (distance < bestDistance) {
        bestDistance = distance
        bestProgress = progress
      }
    }
    return bestProgress
  }

  useEffect(() => {
    if (!contactLockedToReach) return
    const nextProgress = nearestAllowedContactProgress(draft.contactProgress)
    if (nextProgress === null) return
    if (Math.abs(nextProgress - draft.contactProgress) > 0.001) {
      setContactProgress(nextProgress)
    }
  }, [contactLockedToReach, draft.contactProgress, folderReach, hitzoneMustStayInCourt, points, setContactProgress])

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

  const arcColor = '#22c55e'
  const peakHandleColor = '#22c55e'
  const contactColor = contactLockedToReach ? '#ef4444' : '#22c55e'
  const arcWidth = isPreview ? 2 : 4
  const arcOpacity = isPreview ? 0.5 : 1
  const noRay = () => {}

  const handlePeakPointerDown = (e: any) => {
    e.stopPropagation()
    isDragging.current = true
    peakPointerStart.current = { x: e.clientX, y: e.clientY, moved: false }
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
    if (Math.hypot(e.clientX - peakPointerStart.current.x, e.clientY - peakPointerStart.current.y) > 4) {
      peakPointerStart.current.moved = true
    }
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
    if (!peakPointerStart.current.moved) onAdjustmentToggle?.('peak')
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

    if (contactLockedToReach && typeof folderReach === 'number') {
      const candidates = progressCandidatesAtReach(points, folderReach, hitzoneMustStayInCourt)
      let bestProgress: number | null = null
      let bestDistance = Infinity
      candidates.forEach((progress) => {
        const p = pointAtProgress(points, progress)
        if (!p) return
        const distance = contactRaycaster.current.ray.distanceSqToPoint(new THREE.Vector3(p[0], p[1], p[2]))
        if (distance < bestDistance) {
          bestDistance = distance
          bestProgress = progress
        }
      })
      if (bestProgress !== null) setContactProgress(bestProgress)
      return
    }

    let bestIndex = 0
    let bestDistance = Infinity
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const progress = i / Math.max(1, points.length - 1)
      if (progress < 0.02 || progress > 0.98) continue
      if (hitzoneMustStayInCourt && p[0] < ALLY_X_MIN) continue
      const distance = contactRaycaster.current.ray.distanceSqToPoint(new THREE.Vector3(p[0], p[1], p[2]))
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }

    if (!Number.isFinite(bestDistance)) return
    setContactProgress(bestIndex / Math.max(1, points.length - 1))
  }

  const handleContactPointerDown = (e: any) => {
    e.stopPropagation()
    isContactDragging.current = true
    contactPointerStart.current = { x: e.clientX, y: e.clientY, moved: false }
    setContactHovered(true)
    document.body.style.cursor = 'grabbing'
    updateContactFromPointer(e)
    onDragStart()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleContactPointerMove = (e: any) => {
    if (!isContactDragging.current) return
    e.stopPropagation()
    if (Math.hypot(e.clientX - contactPointerStart.current.x, e.clientY - contactPointerStart.current.y) > 4) {
      contactPointerStart.current.moved = true
    }
    updateContactFromPointer(e)
  }

  const handleContactPointerUp = (e: any) => {
    if (!isContactDragging.current) return
    e.stopPropagation()
    isContactDragging.current = false
    if (!contactPointerStart.current.moved) onAdjustmentToggle?.('contact')
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
      <Line points={linePoints} color={arcColor} lineWidth={arcWidth} transparent opacity={arcOpacity} />

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
            color={contactColor}
            lineWidth={1}
            dashed
            dashSize={0.25}
            gapSize={0.15}
            transparent
            opacity={contactHovered || selectedAsset === 'contact' ? 0.5 : 0.32}
          />
          <mesh position={[contactPoint[0], 0.007, contactPoint[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[contactHovered || selectedAsset === 'contact' ? 0.15 : 0.12, 32]} />
            <meshBasicMaterial color={contactColor} transparent opacity={contactHovered || selectedAsset === 'contact' ? 0.65 : 0.45} depthWrite={false} />
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
              <meshBasicMaterial color={contactColor} transparent opacity={contactHovered || selectedAsset === 'contact' ? 0.12 : 0} depthWrite={false} />
            </mesh>
            {(contactHovered || selectedAsset === 'contact') && (
              <mesh raycast={noRay}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={contactColor} transparent opacity={0.28} depthWrite={false} />
              </mesh>
            )}
            <mesh raycast={noRay}>
              <sphereGeometry args={[contactHovered || selectedAsset === 'contact' ? 0.125 : 0.11, 16, 16]} />
              <meshStandardMaterial color={contactColor} emissive={contactColor} emissiveIntensity={contactHovered || selectedAsset === 'contact' ? 0.6 : 0.25} />
            </mesh>
            <Billboard position={[0, 0.28, 0]} raycast={noRay}>
              <Text
                fontSize={0.16}
                anchorX="center"
                anchorY="middle"
                color="#f8fafc"
                outlineColor="#0f172a"
                outlineWidth={0.018}
                raycast={noRay}
              >
                {fmtHeight(contactPoint[1], units)}
              </Text>
            </Billboard>
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
            <meshBasicMaterial color={peakHandleColor} transparent opacity={peakHovered || selectedAsset === 'peak' ? 0.10 : 0} depthWrite={false} />
          </mesh>
          {(peakHovered || selectedAsset === 'peak') && (
            <mesh raycast={noRay}>
              <capsuleGeometry args={[0.09, 0.42, 8, 16]} />
              <meshBasicMaterial color={peakHandleColor} transparent opacity={0.26} depthWrite={false} />
            </mesh>
          )}
          <mesh raycast={noRay}>
            <capsuleGeometry args={[peakHovered || selectedAsset === 'peak' ? 0.036 : 0.03, peakHovered || selectedAsset === 'peak' ? 0.36 : 0.32, 8, 16]} />
            <meshStandardMaterial
              color={peakHandleColor}
              emissive={peakHandleColor}
              emissiveIntensity={peakHovered || selectedAsset === 'peak' ? 0.6 : 0.25}
            />
          </mesh>
          <mesh position={[0, peakHovered || selectedAsset === 'peak' ? 0.28 : 0.25, 0]} raycast={noRay}>
            <coneGeometry args={[peakHovered || selectedAsset === 'peak' ? 0.085 : 0.075, 0.10, 16]} />
            <meshStandardMaterial color={peakHandleColor} emissive={peakHandleColor} emissiveIntensity={peakHovered || selectedAsset === 'peak' ? 0.6 : 0.25} />
          </mesh>
          <mesh position={[0, peakHovered || selectedAsset === 'peak' ? -0.28 : -0.25, 0]} rotation={[Math.PI, 0, 0]} raycast={noRay}>
            <coneGeometry args={[peakHovered || selectedAsset === 'peak' ? 0.085 : 0.075, 0.10, 16]} />
            <meshStandardMaterial color={peakHandleColor} emissive={peakHandleColor} emissiveIntensity={peakHovered || selectedAsset === 'peak' ? 0.6 : 0.25} />
          </mesh>
        </group>
      )}
    </group>
  )
}
