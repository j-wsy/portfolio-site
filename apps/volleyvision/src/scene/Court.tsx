import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { COURT_LENGTH, COURT_WIDTH, ATTACK_LINE } from '../lib/constants'

interface CourtProps {
  onPointerMove?: (e: any) => void
  onPointerDown?: (e: any) => void
  onPointerUp?: (e: any) => void
  onClick?: (e: any) => void
}

export default function Court({ onPointerMove, onPointerDown, onPointerUp, onClick }: CourtProps) {
  const darkMode = useStore((s) => s.darkMode)
  const surfaceColor = darkMode ? '#1a1a2e' : '#f0f0e8'

  const lineGeometry = useMemo(() => {
    const hl = COURT_LENGTH / 2
    const hw = COURT_WIDTH / 2
    const pts: number[] = []

    const addLine = (x1: number, z1: number, x2: number, z2: number) => {
      pts.push(x1, 0.001, z1, x2, 0.001, z2)
    }

    addLine(-hl, -hw, hl, -hw)
    addLine(-hl, hw, hl, hw)
    addLine(-hl, -hw, -hl, hw)
    addLine(hl, -hw, hl, hw)
    addLine(0, -hw, 0, hw)
    addLine(ATTACK_LINE, -hw, ATTACK_LINE, hw)
    addLine(-ATTACK_LINE, -hw, -ATTACK_LINE, hw)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return geo
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[COURT_LENGTH, COURT_WIDTH]} />
        <meshStandardMaterial color={surfaceColor} />
      </mesh>

      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={darkMode ? '#4a4a6a' : '#aaaaaa'} />
      </lineSegments>

      {/* invisible interaction plane for raycasting */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={onClick}
      >
        <planeGeometry args={[COURT_LENGTH, COURT_WIDTH]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
