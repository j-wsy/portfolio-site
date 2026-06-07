import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { useStore, UNSORTED_FOLDER_ID } from '../store/useStore'
import { computeArc } from '../lib/projectile'
import { nearestProgressAtReach, pointAtProgress } from '../lib/hitzone'
import { SET_CONTACT_MULTIPLIER, SETTER_JUMP_HEIGHT } from '../lib/constants'

const GHOST_COLOR = '#7dd3fc'
const CONTACT_COLOR = '#22c55e'
const LOCKED_CONTACT_COLOR = '#ef4444'

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
  const jumpOffset = jumpSet ? SETTER_JUMP_HEIGHT : 0
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
  const lockHitzoneToReach = useStore((s) => s.lockHitzoneToReach)
  const activeFolder = activeFolderId ? folders.find((item) => item.id === activeFolderId) : null

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
        const releaseHeight = preset.setter.heightM * SET_CONTACT_MULTIPLIER + (preset.setter.jumpSet ? SETTER_JUMP_HEIGHT : 0)
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
        const savedProgress = preset.trajectory.contactProgress ?? 0.7
        const folderReach = activeFolder?.maxReachM
        const lockedContact = lockHitzoneToReach && typeof folderReach === 'number'
        const contactColor = lockedContact ? LOCKED_CONTACT_COLOR : CONTACT_COLOR
        const contactProgress = lockedContact
          ? nearestProgressAtReach(points, savedProgress, folderReach, false) ?? savedProgress
          : savedProgress
        const contactPoint = pointAtProgress(points, contactProgress)
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
                color={GHOST_COLOR}
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
                  color={contactColor}
                  lineWidth={1}
                  dashed
                  dashSize={0.25}
                  gapSize={0.15}
                  transparent
                  opacity={0.24}
                />
                <mesh position={[contactPoint[0], contactPoint[1], contactPoint[2]]}>
                  <sphereGeometry args={[0.09, 12, 12]} />
                  <meshBasicMaterial color={contactColor} transparent opacity={0.45} depthWrite={false} />
                </mesh>
                <mesh position={[contactPoint[0], 0.007, contactPoint[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.09, 28]} />
                  <meshBasicMaterial color={contactColor} transparent opacity={0.35} depthWrite={false} />
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
