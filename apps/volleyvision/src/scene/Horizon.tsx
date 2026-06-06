// Sky = canvas background (#0f1a2e). Ground plane gives a clean hard horizon line.
const GROUND_COLOR = '#070810'

export default function Horizon() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial color={GROUND_COLOR} />
    </mesh>
  )
}
