import { useStore } from '../store/useStore'
import { COURT_WIDTH } from '../lib/constants'

export default function Net() {
  const netHeight = useStore((s) => s.net.heightM)
  const setActivePanel = useStore((s) => s.setActivePanel)
  const activePanel = useStore((s) => s.activePanel)
  const darkMode = useStore((s) => s.darkMode)

  return (
    <mesh
      position={[0, netHeight / 2, 0]}
      onClick={(e) => {
        e.stopPropagation()
        setActivePanel(activePanel === 'net' ? null : 'net')
      }}
    >
      <boxGeometry args={[0.05, netHeight, COURT_WIDTH]} />
      <meshStandardMaterial
        color={darkMode ? '#4488cc' : '#2266aa'}
        transparent
        opacity={0.7}
      />
    </mesh>
  )
}
