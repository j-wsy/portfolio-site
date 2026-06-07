import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { COURT_WIDTH, NET_DEPTH, POLE_OFFSET, ANTENNA_ABOVE } from '../lib/constants'

const POLE_R = 0.04
const POLE_EXTRA = 0.20
const ANTENNA_R = 0.016
const CABLE_R = 0.012
const ANTENNA_STRIPE_H = 0.10

export default function Net() {
  const netHeight = useStore((s) => s.net.heightM)

  const hw = COURT_WIDTH / 2
  const poleZ = hw + POLE_OFFSET
  const cableLen = COURT_WIDTH + 2 * POLE_OFFSET

  const netBottom = netHeight - NET_DEPTH
  const poleH = netHeight + POLE_EXTRA

  const antennaH = NET_DEPTH + ANTENNA_ABOVE
  const antennaSegments = Math.round(antennaH / ANTENNA_STRIPE_H)
  const antennaCenterY = netBottom + antennaH / 2

  return (
    <group>
      {/* poles at Z=+/-poleZ */}
      {([-poleZ, poleZ] as number[]).map((z) => (
        <mesh key={z} position={[0, poleH / 2, z]}>
          <cylinderGeometry args={[POLE_R, POLE_R, poleH, 12]} />
          <meshStandardMaterial color="#c8c8c8" />
        </mesh>
      ))}

      {/* top cable - pole to pole */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, netHeight, 0]}>
        <cylinderGeometry args={[CABLE_R, CABLE_R, cableLen, 8]} />
        <meshStandardMaterial color="#dddddd" />
      </mesh>

      {/* bottom cable - pole to pole */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, netBottom, 0]}>
        <cylinderGeometry args={[CABLE_R * 0.7, CABLE_R * 0.7, cableLen, 8]} />
        <meshStandardMaterial color="#aaaaaa" />
      </mesh>

      {/* antennas at court edge Z=+/-hw */}
      {([-hw, hw] as number[]).map((z) => (
        <group key={z} position={[0, netBottom, z]}>
          {Array.from({ length: antennaSegments }, (_, i) => {
            const segmentH = antennaH / antennaSegments
            const y = segmentH * i + segmentH / 2
            const topFirstIndex = antennaSegments - 1 - i
            return (
              <mesh key={i} position={[0, y, 0]}>
                <cylinderGeometry args={[ANTENNA_R, ANTENNA_R, segmentH, 8]} />
                <meshStandardMaterial color={topFirstIndex % 2 === 0 ? '#cc2222' : '#f8fafc'} />
              </mesh>
            )
          })}
        </group>
      ))}

      {/* net mesh - semi-transparent plane extended past antennas toward poles */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0, netBottom + NET_DEPTH / 2, 0]}>
        <planeGeometry args={[COURT_WIDTH + 1.2, NET_DEPTH]} />
        <meshStandardMaterial color="#e8e8e8" transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
