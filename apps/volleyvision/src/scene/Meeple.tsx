import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { ALLY_X_MIN, ALLY_X_MAX, ALLY_Z_MIN, ALLY_Z_MAX, SET_CONTACT_MULTIPLIER, SETTER_JUMP_HEIGHT } from '../lib/constants'

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

const COURT_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

interface MeepleProps {
  onDragStart: () => void
  onDragEnd: () => void
  selected?: boolean
  onAdjustmentToggle?: () => void
}

export default function Meeple({ onDragStart, onDragEnd, selected = false, onAdjustmentToggle }: MeepleProps) {
  const { camera, gl, raycaster } = useThree()
  const setterPosition = useStore((s) => s.setterPosition)
  const setter = useStore((s) => s.setter)
  const setSetterPosition = useStore((s) => s.setSetterPosition)

  const [hovered, setHovered] = useState(false)
  const isDragging = useRef(false)
  const hit = useRef(new THREE.Vector3())
  const dragOffset = useRef<[number, number]>([0, 0])
  const pointerStart = useRef({ x: 0, y: 0, moved: false })

  const h = setter.heightM

  const r_head       = h * 0.08
  const leg_h        = h * 0.40
  const leg_r        = h * 0.04
  const leg_x        = leg_r * 1.15
  const body_cap_r   = h * 0.07
  const body_cyl_l   = h * 0.44 - 2 * body_cap_r
  const body_center_y = h * 0.62
  const head_center_y = h * 0.92
  const cyl_r        = leg_r * 4.5
  const jumping = setter.jumpSet
  const jumpOffset = jumping ? SETTER_JUMP_HEIGHT : 0
  const hitboxH = h * SET_CONTACT_MULTIPLIER + jumpOffset

  const baseColor     = '#f59e0b'
  const active        = hovered || selected
  const emissiveColor = active ? baseColor : '#000000'
  const emissiveInt   = active ? 0.3 : 0
  const ringOpacity   = active ? 0.7 : 0.4

  const getWorldXZ = (clientX: number, clientY: number): [number, number] | null => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndcX =  ((clientX - rect.left) / rect.width)  * 2 - 1
    const ndcY = -((clientY - rect.top)  / rect.height) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
    if (!raycaster.ray.intersectPlane(COURT_PLANE, hit.current)) return null
    return [hit.current.x, hit.current.z]
  }

  const handlePointerEnter = (e: any) => {
    e.stopPropagation(); setHovered(true); document.body.style.cursor = 'grab'
  }
  const handlePointerLeave = (e: any) => {
    e.stopPropagation()
    if (!isDragging.current) { setHovered(false); document.body.style.cursor = 'auto' }
  }
  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    isDragging.current = true
    pointerStart.current = { x: e.clientX, y: e.clientY, moved: false }
    document.body.style.cursor = 'grabbing'
    const clickXZ = getWorldXZ(e.clientX, e.clientY)
    const cur = useStore.getState().setterPosition
    dragOffset.current = clickXZ ? [cur[0] - clickXZ[0], cur[1] - clickXZ[1]] : [0, 0]
    onDragStart()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    const pos = getWorldXZ(e.clientX, e.clientY)
    if (!pos) return
    if (Math.hypot(e.clientX - pointerStart.current.x, e.clientY - pointerStart.current.y) > 4) {
      pointerStart.current.moved = true
    }
    setSetterPosition([
      clamp(pos[0] + dragOffset.current[0], ALLY_X_MIN, ALLY_X_MAX),
      clamp(pos[1] + dragOffset.current[1], ALLY_Z_MIN, ALLY_Z_MAX),
    ])
  }
  const handlePointerUp = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    isDragging.current = false
    if (!pointerStart.current.moved) onAdjustmentToggle?.()
    document.body.style.cursor = hovered ? 'grab' : 'auto'
    onDragEnd()
  }
  const handlePointerCancel = (e: any) => {
    if (!isDragging.current) return
    e.stopPropagation()
    isDragging.current = false
    document.body.style.cursor = 'auto'
    onDragEnd()
  }

  const noRay = () => {}

  const [px, pz] = setterPosition

  return (
    <group position={[px, 0, pz]}>
      {/* Invisible interaction cylinder - sole raycast target */}
      <mesh
        position={[0, hitboxH / 2, 0]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
      >
        <cylinderGeometry args={[cyl_r, cyl_r, hitboxH, 16]} />
        <meshBasicMaterial color={baseColor} transparent opacity={active ? 0.08 : 0} depthWrite={false} />
      </mesh>

      {/* Foot ring - always at floor level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} raycast={noRay}>
        <ringGeometry args={[leg_r * 2.8, leg_r * (active ? 5.2 : 4.5), 48]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={ringOpacity}
        />
      </mesh>

      {/* Ghost body - only shown when jump-set is active (floor position) */}
      {jumping && (
        <>
          <mesh position={[-leg_x, leg_h / 2, 0]} raycast={noRay}>
            <cylinderGeometry args={[leg_r, leg_r, leg_h, 8]} />
            <meshStandardMaterial color={baseColor} transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <mesh position={[leg_x, leg_h / 2, 0]} raycast={noRay}>
            <cylinderGeometry args={[leg_r, leg_r, leg_h, 8]} />
            <meshStandardMaterial color={baseColor} transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <mesh position={[0, body_center_y, 0]} raycast={noRay}>
            <capsuleGeometry args={[body_cap_r, body_cyl_l, 8, 16]} />
            <meshStandardMaterial color={baseColor} transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <mesh position={[0, head_center_y, 0]} raycast={noRay}>
            <sphereGeometry args={[r_head, 16, 16]} />
            <meshStandardMaterial color={baseColor} transparent opacity={0.18} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* Main body - at floor when standing, elevated when jump-set */}
      <mesh position={[-leg_x, leg_h / 2 + jumpOffset, 0]} raycast={noRay}>
        <cylinderGeometry args={[leg_r, leg_r, leg_h, 8]} />
        <meshStandardMaterial color={baseColor} emissive={emissiveColor} emissiveIntensity={emissiveInt} />
      </mesh>
      <mesh position={[leg_x, leg_h / 2 + jumpOffset, 0]} raycast={noRay}>
        <cylinderGeometry args={[leg_r, leg_r, leg_h, 8]} />
        <meshStandardMaterial color={baseColor} emissive={emissiveColor} emissiveIntensity={emissiveInt} />
      </mesh>
      <mesh position={[0, body_center_y + jumpOffset, 0]} raycast={noRay}>
        <capsuleGeometry args={[body_cap_r, body_cyl_l, 8, 16]} />
        <meshStandardMaterial color={baseColor} emissive={emissiveColor} emissiveIntensity={emissiveInt} />
      </mesh>
      <mesh position={[0, head_center_y + jumpOffset, 0]} raycast={noRay}>
        <sphereGeometry args={[r_head, 16, 16]} />
        <meshStandardMaterial color={baseColor} emissive={emissiveColor} emissiveIntensity={emissiveInt} />
      </mesh>
    </group>
  )
}
