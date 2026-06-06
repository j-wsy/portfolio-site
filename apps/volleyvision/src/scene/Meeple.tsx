import { useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import {
  ALLY_X_MIN, ALLY_X_MAX, ALLY_Z_MIN, ALLY_Z_MAX,
} from '../lib/constants'

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

const COURT_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

interface MeepleProps {
  onDragStart: () => void
  onDragEnd: () => void
}

export default function Meeple({ onDragStart, onDragEnd }: MeepleProps) {
  const { camera, gl, raycaster } = useThree()
  const setterPosition = useStore((s) => s.setterPosition)
  const setter = useStore((s) => s.setter)
  const setSetterPosition = useStore((s) => s.setSetterPosition)
  const setActivePanel = useStore((s) => s.setActivePanel)
  const activePanel = useStore((s) => s.activePanel)
  const darkMode = useStore((s) => s.darkMode)

  const isDragging = useRef(false)
  const hasMoved = useRef(false)
  const hit = useRef(new THREE.Vector3())

  const h = setter.heightM
  const color = darkMode ? '#f59e0b' : '#d97706'

  const getWorldXZ = (clientX: number, clientY: number): [number, number] | null => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
    if (!raycaster.ray.intersectPlane(COURT_PLANE, hit.current)) return null
    return [hit.current.x, hit.current.z]
  }

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    isDragging.current = true
    hasMoved.current = false
    onDragStart()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    hasMoved.current = true

    const pos = getWorldXZ(e.clientX, e.clientY)
    if (!pos) return
    const [x, z] = pos
    setSetterPosition([
      clamp(x, ALLY_X_MIN, ALLY_X_MAX),
      clamp(z, ALLY_Z_MIN, ALLY_Z_MAX),
    ])
  }

  const handlePointerUp = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    isDragging.current = false
    onDragEnd()

    if (!hasMoved.current) {
      setActivePanel(activePanel === 'setter' ? null : 'setter')
    }
  }

  const [px, pz] = setterPosition

  return (
    <group
      position={[px, 0, pz]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <mesh position={[0, h * 0.55, 0]}>
        <capsuleGeometry args={[0.09, 0.35, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, h * 0.9 + 0.12, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.07, 0.15, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.07, 0.15, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}
