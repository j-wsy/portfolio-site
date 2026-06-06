import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { useStore, UNSORTED_FOLDER_ID } from '../store/useStore'
import { computeArc, checkNetClearance } from '../lib/projectile'

const GHOST_COLOR = '#7dd3fc'
const ALERT_COLOR = '#fb7185'
const CONTACT_COLOR = '#22c55e'

function pointAtProgress(points: [number, number, number][], progress: number): [number, number, number] | null {
  if (points.length === 0) return null
  const clamped = Math.min(1, Math.max(0, progress))
  const scaled = clamped * (points.length - 1)
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

function GhostMeeple({
  position,
  height,
  jumpSet,
}: {
  position: [number, number]
  height: number
  jumpSet: boolean
}) {
  const [x, z] = position
  const jumpOffset = jumpSet ? 0.254 : 0
  const opacity = 0.18
  const rHead = height * 0.08
  const legH = height * 0.40
  const legR = height * 0.04
  const legX = legR * 1.15
  const bodyCapR = height * 0.07
  const bodyCylL = height * 0.44 - 2 * bodyCapR
  const bodyCenterY = height * 0.62
  const headCenterY = height * 0.92

  return (
    <group position={[x, 0, z]}>
      <mesh position={[-legX, legH / 2 + jumpOffset, 0]}>
        <cylinderGeometry args={[legR, legR, legH, 8]} />
        <meshStandardMaterial color={GHOST_COLOR} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh position={[legX, legH / 2 + jumpOffset, 0]}>
        <cylinderGeometry args={[legR, legR, legH, 8]} />
        <meshStandardMaterial color={GHOST_COLOR} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh position={[0, bodyCenterY + jumpOffset, 0]}>
        <capsuleGeometry args={[bodyCapR, bodyCylL, 8, 16]} />
        <meshStandardMaterial color={GHOST_COLOR} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh position={[0, headCenterY + jumpOffset, 0]}>
        <sphereGeometry args={[rHead, 16, 16]} />
        <meshStandardMaterial color={GHOST_COLOR} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </group>
  )
}

interface FolderPreviewProps {
  enabled?: boolean
}

export default function FolderPreview({ enabled = true }: FolderPreviewProps) {
  const presets = useStore((s) => s.presets)
  const folders = useStore((s) => s.folders)
  const activeFolderId = useStore((s) => s.activeFolderId)
  const activePresetId = useStore((s) => s.activePresetId)

  const previewPresets = useMemo(() => {
    if (!enabled || !activeFolderId || activePresetId) return []

    const assignedIds = new Set(
      folders
        .filter((folder) => folder.id !== UNSORTED_FOLDER_ID)
        .flatMap((folder) => folder.presetIds)
    )
    const folder = folders.find((item) => item.id === activeFolderId)
    const ids = new Set(folder?.presetIds ?? [])

    if (activeFolderId === UNSORTED_FOLDER_ID) {
      presets.forEach((preset) => {
        if (!assignedIds.has(preset.id)) ids.add(preset.id)
      })
    }

    return presets.filter((preset) => ids.has(preset.id))
  }, [activeFolderId, activePresetId, enabled, folders, presets])

  if (previewPresets.length === 0) return null

  return (
    <group>
      {previewPresets.map((preset) => {
        const releaseHeight = preset.setter.heightM * (preset.setter.jumpSet ? 1.15 : 1.0) * 0.9
        const start: [number, number, number] = [
          preset.setterPosition[0],
          releaseHeight,
          preset.setterPosition[1],
        ]
        const landing: [number, number, number] = [
          preset.trajectory.landingPosition[0],
          0,
          preset.trajectory.landingPosition[1],
        ]
        const points = computeArc(start, landing, preset.trajectory.peakHeight)
        const clears = checkNetClearance(points, preset.net.heightM)
        const color = landing[0] < 0 || !clears ? ALERT_COLOR : GHOST_COLOR
        const contactPoint = pointAtProgress(points, preset.trajectory.contactProgress ?? 0.7)
        return (
          <group key={preset.id}>
            <GhostMeeple
              position={preset.setterPosition}
              height={preset.setter.heightM}
              jumpSet={preset.setter.jumpSet}
            />
            {points.length > 0 && (
              <Line
                points={points}
                color={color}
                lineWidth={2}
                transparent
                opacity={0.32}
              />
            )}
            {contactPoint && (
              <>
                <Line
                  points={[
                    [contactPoint[0], contactPoint[1], contactPoint[2]],
                    [contactPoint[0], 0.003, contactPoint[2]],
                  ]}
                  color={CONTACT_COLOR}
                  lineWidth={1}
                  dashed
                  dashSize={0.25}
                  gapSize={0.15}
                  transparent
                  opacity={0.24}
                />
                <mesh position={[contactPoint[0], contactPoint[1], contactPoint[2]]}>
                  <sphereGeometry args={[0.09, 12, 12]} />
                  <meshBasicMaterial color={CONTACT_COLOR} transparent opacity={0.45} depthWrite={false} />
                </mesh>
                <mesh position={[contactPoint[0], 0.007, contactPoint[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.09, 28]} />
                  <meshBasicMaterial color={CONTACT_COLOR} transparent opacity={0.35} depthWrite={false} />
                </mesh>
              </>
            )}
            <mesh position={[landing[0], 0.006, landing[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.16, 0.34, 40]} />
              <meshBasicMaterial color="#22c55e" transparent opacity={0.35} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
