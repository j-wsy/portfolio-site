import React from 'react'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import {
  COURT_LENGTH,
  COURT_WIDTH,
  ATTACK_LINE,
  OUTER_X_MAX,
  OUTER_X_MIN,
  OUTER_Z_MAX,
  OUTER_Z_MIN,
  SET_X_MAX,
  SET_X_MIN,
  SET_Z_MAX,
  SET_Z_MIN,
} from '../lib/constants'

const HL = COURT_LENGTH / 2   // 9
const HW = COURT_WIDTH / 2    // 4.5
const LINE_Y = 0.003
const LINE_H = 0.003
const LINE_W = 0.05            // 5 cm

const OUTER_SURF_DARK  = '#0f1628'
const OUTER_SURF_LIGHT = '#d0d5c8'
const OUTER_BORDER_DARK  = '#1e527a'
const OUTER_BORDER_LIGHT = '#7a8e9a'

// Attack-line dash markings
const DASH_LEN       = 0.15   // dash length
const DASH_GAP       = 0.05   // gap between dashes
const DASH_START_GAP = 0.05   // gap from sideline before first dash
const NUM_ATTACK_DASHES = 4

// Service-line mark (single dash per sideline, outside end line)
const SVC_DASH_LEN = 0.15
const SVC_DASH_GAP = 0.05     // gap from end line

function ZLine({ x, z0, z1, color }: { x: number; z0: number; z1: number; color: string }) {
  return (
    <mesh position={[x, LINE_Y, (z0 + z1) / 2]}>
      <boxGeometry args={[LINE_W, LINE_H, Math.abs(z1 - z0)]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}
function XLine({ z, x0, x1, color }: { z: number; x0: number; x1: number; color: string }) {
  return (
    <mesh position={[(x0 + x1) / 2, LINE_Y, z]}>
      <boxGeometry args={[Math.abs(x1 - x0), LINE_H, LINE_W]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

interface CourtProps {
  onPointerMove?: (e: any) => void
  onClick?: (e: any) => void
}

export default function Court({ onPointerMove, onClick }: CourtProps) {
  const darkMode = useStore((s) => s.darkMode)
  const showOpponentCourt = useStore((s) => s.showOpponentCourt)

  const surfaceColor = darkMode ? '#1a1a2e' : '#f0f0e8'
  const lineColor = darkMode ? '#a8b8c8' : '#5e6b75'
  const outerSurfColor   = darkMode ? OUTER_SURF_DARK   : OUTER_SURF_LIGHT
  const outerBorderColor = darkMode ? OUTER_BORDER_DARK : OUTER_BORDER_LIGHT

  const outerZTop = OUTER_Z_MAX
  const outerZBottom = OUTER_Z_MIN
  const outerXRight = OUTER_X_MAX
  const outerXLeft = showOpponentCourt ? OUTER_X_MIN : 0
  const outerWidth = outerXRight - outerXLeft
  const outerDepth = outerZTop - outerZBottom
  const outerCtrX = (outerXLeft + outerXRight) / 2
  const outerCtrZ = (outerZBottom + outerZTop) / 2

  // 4 dashes outside a sideline for the attack line
  const attackDashes = (ax: number, dir: 1 | -1): React.ReactElement[] =>
    Array.from({ length: NUM_ATTACK_DASHES }, (_, i) => {
      const zCenter = dir * (HW + DASH_START_GAP + i * (DASH_LEN + DASH_GAP) + DASH_LEN / 2)
      return (
        <mesh key={i} position={[ax, LINE_Y, zCenter]}>
          <boxGeometry args={[LINE_W, LINE_H, DASH_LEN]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      )
    })

  // 1 dash per sideline, outside an end line, with a gap
  // xDir: +1 = ally end (X=+HL), -1 = opponent end (X=-HL)
  const svcMark = (xDir: 1 | -1): React.ReactElement[] =>
    ([HW, -HW] as number[]).map((z, idx) => (
      <mesh key={idx} position={[xDir * (HL + SVC_DASH_GAP + SVC_DASH_LEN / 2), LINE_Y, z]}>
        <boxGeometry args={[SVC_DASH_LEN, LINE_H, LINE_W]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
    ))

  return (
    <group>
      {/* OUTER FREE-ZONE SURFACE */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[outerCtrX, -0.002, outerCtrZ]}>
        <planeGeometry args={[outerWidth, outerDepth]} />
        <meshBasicMaterial color={outerSurfColor} />
      </mesh>

      {/* OUTER FREE-ZONE BORDER */}
      <XLine z={outerZTop} x0={outerXLeft} x1={outerXRight} color={outerBorderColor} />
      <XLine z={outerZBottom} x0={outerXLeft} x1={outerXRight} color={outerBorderColor} />
      <ZLine x={outerXRight} z0={outerZBottom} z1={outerZTop} color={outerBorderColor} />
      {showOpponentCourt && (
        <ZLine x={outerXLeft} z0={outerZBottom} z1={outerZTop} color={outerBorderColor} />
      )}

      {/* COURT SURFACE */}
      {showOpponentCourt ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[COURT_LENGTH, COURT_WIDTH]} />
          <meshStandardMaterial color={surfaceColor} />
        </mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[HL / 2, 0, 0]}>
          <planeGeometry args={[HL, COURT_WIDTH]} />
          <meshStandardMaterial color={surfaceColor} />
        </mesh>
      )}

      {/* ALLY-SIDE LINES (always visible) */}
      <XLine z={HW}  x0={0} x1={HL} color={lineColor} />
      <XLine z={-HW} x0={0} x1={HL} color={lineColor} />
      <ZLine x={HL}           z0={-HW} z1={HW} color={lineColor} />
      <ZLine x={0}            z0={-HW} z1={HW} color={lineColor} />
      <ZLine x={ATTACK_LINE}  z0={-HW} z1={HW} color={lineColor} />
      {attackDashes(ATTACK_LINE,  1)}
      {attackDashes(ATTACK_LINE, -1)}
      {svcMark(1)}

      {/* OPPONENT-SIDE LINES (conditional) */}
      {showOpponentCourt && (
        <>
          <XLine z={HW}  x0={-HL} x1={0} color={lineColor} />
          <XLine z={-HW} x0={-HL} x1={0} color={lineColor} />
          <ZLine x={-HL}           z0={-HW} z1={HW} color={lineColor} />
          <ZLine x={-ATTACK_LINE}  z0={-HW} z1={HW} color={lineColor} />
          {attackDashes(-ATTACK_LINE,  1)}
          {attackDashes(-ATTACK_LINE, -1)}
          {svcMark(-1)}
        </>
      )}

      {/* invisible interaction plane - always full court for ray casting */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        position={[(SET_X_MIN + SET_X_MAX) / 2, 0, (SET_Z_MIN + SET_Z_MAX) / 2]}
        onPointerMove={onPointerMove}
        onClick={onClick}
      >
        <planeGeometry args={[SET_X_MAX - SET_X_MIN, SET_Z_MAX - SET_Z_MIN]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
