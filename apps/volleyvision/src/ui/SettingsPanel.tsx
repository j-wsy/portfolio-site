import { useRef, useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { FIVB_MEN_NET, FIVB_WOMEN_NET, MIN_SETTER_HEIGHT, SETTER_JUMP_HEIGHT } from '../lib/constants'
import { fmtHeight, fmtNetHeight } from '../lib/units'
import { useIsMobile } from '../lib/useIsMobile'

// Persists position across open/close cycles within the same session
let _pos: { x: number; y: number } | null = null

const PANEL_W = 320
const PANEL_MARGIN = 16
const MAX_SETTER_HEIGHT = 3.0

function clampPanelPos(pos: { x: number; y: number }) {
  return {
    x: Math.min(Math.max(PANEL_MARGIN, pos.x), Math.max(PANEL_MARGIN, window.innerWidth - PANEL_W - PANEL_MARGIN)),
    y: Math.min(Math.max(PANEL_MARGIN, pos.y), Math.max(PANEL_MARGIN, window.innerHeight - 120)),
  }
}

export default function SettingsPanel() {
  const isMobile = useIsMobile()
  const setter = useStore((s) => s.setter)
  const updateSetter = useStore((s) => s.updateSetter)
  const net = useStore((s) => s.net)
  const updateNet = useStore((s) => s.updateNet)
  const showOpponentCourt = useStore((s) => s.showOpponentCourt)
  const toggleOpponentCourt = useStore((s) => s.toggleOpponentCourt)
  const lockHitzoneToReach = useStore((s) => s.lockHitzoneToReach)
  const toggleLockHitzoneToReach = useStore((s) => s.toggleLockHitzoneToReach)
  const hitzoneMustStayInCourt = useStore((s) => s.hitzoneMustStayInCourt)
  const toggleHitzoneMustStayInCourt = useStore((s) => s.toggleHitzoneMustStayInCourt)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const topPanel = useStore((s) => s.topPanel)
  const units = useStore((s) => s.units)
  const toggleUnits = useStore((s) => s.toggleUnits)
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)

  const [showCustomNet, setShowCustomNet] = useState(false)
  const [heightText, setHeightText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>(() =>
    _pos ?? { x: Math.max(16, window.innerWidth - PANEL_W - 20), y: 16 }
  )

  const fileRef = useRef<HTMLInputElement>(null)
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const updatePos = (newPos: { x: number; y: number }) => {
    const clamped = clampPanelPos(newPos)
    _pos = clamped
    setPos(clamped)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      updatePos({
        x: Math.max(0, dragStart.current.px + e.clientX - dragStart.current.mx),
        y: Math.max(0, dragStart.current.py + e.clientY - dragStart.current.my),
      })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    const onResize = () => updatePos(_pos ?? pos)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const sectionLabel = 'text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2'
  const btnBase = 'py-1.5 rounded-lg text-sm font-medium border transition-colors'
  const btnActive = 'bg-blue-500 border-blue-500 text-white'
  const btnIdle = 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'

  useEffect(() => {
    setHeightText(
      units === 'metric'
        ? String(Math.round(setter.heightM * 100))
        : String(Math.round(setter.heightM * 39.3701 * 10) / 10)
    )
  }, [setter.heightM, units])

  const commitSetterHeight = () => {
    const value = Number(heightText)
    if (!Number.isFinite(value)) {
      setHeightText(units === 'metric' ? String(Math.round(setter.heightM * 100)) : String(Math.round(setter.heightM * 39.3701 * 10) / 10))
      return
    }
    const meters = units === 'metric' ? value / 100 : value / 39.3701
    updateSetter({ heightM: Math.min(MAX_SETTER_HEIGHT, Math.max(MIN_SETTER_HEIGHT, meters)) })
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        importData(ev.target!.result as string)
        setImportError(null)
      } catch (err: any) {
        setImportError(err.message ?? 'Import failed')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div
      className={`fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl select-none flex flex-col ${
        isMobile
          ? `left-2 right-2 top-20 bottom-24 rounded-xl overflow-hidden ${topPanel === 'settings' ? 'z-40' : 'z-30'}`
          : 'z-30 rounded-xl max-h-[calc(100vh-2rem)]'
      }`}
      style={isMobile ? undefined : { left: pos.x, top: pos.y, width: PANEL_W }}
    >
      {/* drag handle / header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'}`}
        onMouseDown={(e) => {
          if (isMobile) return
          dragging.current = true
          dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
        }}
      >
        <span className="font-semibold text-sm text-gray-900 dark:text-white">Settings</span>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500 text-sm font-semibold leading-none text-white hover:bg-red-600 transition-colors"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setSettingsOpen(false)}
          aria-label="Close settings"
        >
          x
        </button>
      </div>

      <div className={`${isMobile ? 'flex-1 min-h-0 p-3 gap-4' : 'max-h-[calc(100vh-5.25rem)] p-4 gap-5'} flex flex-col overflow-y-auto`}>

        {/* Units */}
        <div>
          <div className={sectionLabel}>Units</div>
          <div className="flex gap-2">
            <button
              onClick={() => units !== 'metric' && toggleUnits()}
              className={`flex-1 ${btnBase} ${units === 'metric' ? btnActive : btnIdle}`}
            >
              Metric (cm)
            </button>
            <button
              onClick={() => units !== 'imperial' && toggleUnits()}
              className={`flex-1 ${btnBase} ${units === 'imperial' ? btnActive : btnIdle}`}
            >
              Imperial
            </button>
          </div>
        </div>

        {/* Net Height */}
        <div>
          <div className={sectionLabel}>Net Height</div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => { updateNet({ heightM: FIVB_MEN_NET }); setShowCustomNet(false) }}
              className={`${btnBase} ${!showCustomNet && net.heightM === FIVB_MEN_NET ? btnActive : btnIdle}`}
            >
              FIVB Men ({fmtNetHeight(FIVB_MEN_NET, units)})
            </button>
            <button
              onClick={() => { updateNet({ heightM: FIVB_WOMEN_NET }); setShowCustomNet(false) }}
              className={`${btnBase} ${!showCustomNet && net.heightM === FIVB_WOMEN_NET ? btnActive : btnIdle}`}
            >
              FIVB Women ({fmtNetHeight(FIVB_WOMEN_NET, units)})
            </button>
            <button
              onClick={() => setShowCustomNet(true)}
              className={`${btnBase} ${showCustomNet ? btnActive : btnIdle}`}
            >
              Custom
            </button>
            {showCustomNet && (
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {fmtNetHeight(net.heightM, units)}
                </span>
                <input
                  type="range"
                  min={100}
                  max={300}
                  step={1}
                  value={Math.round(net.heightM * 100)}
                  onChange={(e) => updateNet({ heightM: Number(e.target.value) / 100 })}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{fmtNetHeight(1.0, units)}</span>
                  <span>{fmtNetHeight(3.0, units)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Setter */}
        <div>
          <div className={sectionLabel}>Setter</div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
            Height (Set contact point = height * 1.15)
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              min={units === 'metric' ? MIN_SETTER_HEIGHT * 100 : Math.round(MIN_SETTER_HEIGHT * 39.3701 * 10) / 10}
              max={units === 'metric' ? MAX_SETTER_HEIGHT * 100 : Math.round(MAX_SETTER_HEIGHT * 39.3701 * 10) / 10}
              step={units === 'metric' ? 1 : 0.5}
              value={heightText}
              onChange={(e) => setHeightText(e.target.value)}
              onBlur={commitSetterHeight}
              onKeyDown={(e) => { if (e.key === 'Enter') commitSetterHeight() }}
              className="w-24 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {units === 'metric' ? 'cm' : 'in'}
            </span>
          </div>
          <input
            type="range"
            min={MIN_SETTER_HEIGHT * 100}
            max={MAX_SETTER_HEIGHT * 100}
            step={1}
            value={Math.round(setter.heightM * 100)}
            onChange={(e) => updateSetter({ heightM: Number(e.target.value) / 100 })}
            className="w-full accent-blue-500 mb-1"
          />
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>{fmtHeight(MIN_SETTER_HEIGHT, units)}</span>
            <span>{fmtHeight(3.00, units)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateSetter({ jumpSet: false })}
              className={`flex-1 ${btnBase} ${!setter.jumpSet ? btnActive : btnIdle}`}
            >
              Standing
            </button>
            <button
              onClick={() => updateSetter({ jumpSet: true })}
              className={`flex-1 ${btnBase} ${setter.jumpSet ? btnActive : btnIdle}`}
            >
              Jump Set (+{fmtHeight(SETTER_JUMP_HEIGHT, units)})
            </button>
          </div>
        </div>

        {/* Court View */}
        <div>
          <div className={sectionLabel}>Court View</div>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-300">Show opponent court</span>
            <div className="relative" onClick={toggleOpponentCourt}>
              <div className={`w-10 h-5 rounded-full transition-colors ${showOpponentCourt ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showOpponentCourt ? 'translate-x-5' : ''}`} />
            </div>
          </label>
        </div>

        {/* Hitzone */}
        <div>
          <div className={sectionLabel}>Hitzone</div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Lock hitzone to the player's max reach</span>
              <div className="relative flex-shrink-0" onClick={toggleLockHitzoneToReach}>
                <div className={`w-10 h-5 rounded-full transition-colors ${lockHitzoneToReach ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${lockHitzoneToReach ? 'translate-x-5' : ''}`} />
              </div>
            </label>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Hitzone must be within your court</span>
              <div className="relative flex-shrink-0" onClick={toggleHitzoneMustStayInCourt}>
                <div className={`w-10 h-5 rounded-full transition-colors ${hitzoneMustStayInCourt ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${hitzoneMustStayInCourt ? 'translate-x-5' : ''}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Data */}
        <div>
          <div className={sectionLabel}>Data</div>
          <div className="flex gap-2">
            <button
              onClick={exportData}
              className={`flex-1 ${btnBase} ${btnIdle}`}
            >
              Export Data
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className={`flex-1 ${btnBase} ${btnIdle}`}
            >
              Import Data
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Includes presets, player folders, max reach values, units, net, setter, court, and hitzone settings.
          </p>
          {importError && (
            <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-500 dark:bg-red-950">
              {importError}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
