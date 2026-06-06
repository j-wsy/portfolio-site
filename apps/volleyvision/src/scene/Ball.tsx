interface BallProps {
  position: [number, number, number]
}

export default function Ball({ position }: BallProps) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
    </mesh>
  )
}
