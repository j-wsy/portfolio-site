import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { SET_X_MIN, SET_X_MAX, SET_Z_MIN, SET_Z_MAX } from '../lib/constants'

interface BallProps {
  position: [number, number, number]
  draggable?: boolean
  color?: string
  onDragStart?: () => void
  onDragEnd?: () => void
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

const COURT_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

export default function Ball({
  position,
  draggable = false,
  color = '#22c55e',
  onDragStart,
  onDragEnd,
}: BallProps) {
  const { camera, gl, raycaster } = useThree()
  const setLandingPosition = useStore((s) => s.setLandingPosition)
  const [highlighted, setHighlighted] = useState(false)
  const isDragging = useRef(false)
  const hit = useRef(new THREE.Vector3())
  const dragOffset = useRef<[number, number]>([0, 0])

  const cursor = draggable ? 'grab' : 'auto'

  const getWorldXZ = (clientX: number, clientY: number): [number, number] | null => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
    if (!raycaster.ray.intersectPlane(COURT_PLANE, hit.current)) return null
    return [hit.current.x, hit.current.z]
  }

  const handlePointerEnter = (e: any) => {
    if (!draggable) return
    e.stopPropagation()
    setHighlighted(true)
    document.body.style.cursor = cursor
  }

  const handlePointerLeave = (e: any) => {
    if (!draggable) return
    e.stopPropagation()
    if (!isDragging.current) {
      setHighlighted(false)
      document.body.style.cursor = 'auto'
    }
  }

  const handlePointerDown = (e: any) => {
    if (!draggable) return
    e.stopPropagation()
    isDragging.current = true
    setHighlighted(true)
    document.body.style.cursor = 'grabbing'
    const clickXZ = getWorldXZ(e.clientX, e.clientY)
    dragOffset.current = clickXZ ? [position[0] - clickXZ[0], position[2] - clickXZ[1]] : [0, 0]
    onDragStart?.()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: any) => {
    if (!draggable || !isDragging.current) return
    e.stopPropagation()
    const pos = getWorldXZ(e.clientX, e.clientY)
    if (!pos) return
    setLandingPosition([
      clamp(pos[0] + dragOffset.current[0], SET_X_MIN, SET_X_MAX),
      0,
      clamp(pos[1] + dragOffset.current[1], SET_Z_MIN, SET_Z_MAX),
    ])
  }

  const handlePointerUp = (e: any) => {
    if (!draggable || !isDragging.current) return
    e.stopPropagation()
    isDragging.current = false
    setHighlighted(false)
    document.body.style.cursor = cursor
    onDragEnd?.()
  }

  const handlePointerCancel = (e: any) => {
    if (!draggable || !isDragging.current) return
    e.stopPropagation()
    isDragging.current = false
    setHighlighted(false)
    document.body.style.cursor = 'auto'
    onDragEnd?.()
  }

  return (
    <group position={[position[0], 0, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh
        position={[0, 0, 0.01]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
      >
        <circleGeometry args={[0.49, 48]} />
        <meshBasicMaterial color={color} transparent opacity={highlighted ? 0.10 : 0} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, 0.007]} raycast={() => {}}>
        <ringGeometry args={[0.20, highlighted ? 0.50 : 0.44, 48]} />
        <meshBasicMaterial color={color} transparent opacity={highlighted ? 0.95 : 0.9} depthWrite={false} />
      </mesh>

      {highlighted && (
        <mesh position={[0, 0, 0.006]} raycast={() => {}}>
          <ringGeometry args={[0.48, 0.56, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.48} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
