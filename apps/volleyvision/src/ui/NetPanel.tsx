import { useState } from 'react'
import { useStore } from '../store/useStore'
import { FIVB_MEN_NET, FIVB_WOMEN_NET } from '../lib/constants'

export default function NetPanel() {
  const net = useStore((s) => s.net)
  const updateNet = useStore((s) => s.updateNet)
  const setActivePanel = useStore((s) => s.setActivePanel)
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="absolute top-16 right-4 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 z-20">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Net</h2>
        <button
          onClick={() => setActivePanel(null)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => { updateNet({ heightM: FIVB_MEN_NET }); setShowCustom(false) }}
          className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
            !showCustom && net.heightM === FIVB_MEN_NET
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          FIVB Men (2.43m)
        </button>
        <button
          onClick={() => { updateNet({ heightM: FIVB_WOMEN_NET }); setShowCustom(false) }}
          className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
            !showCustom && net.heightM === FIVB_WOMEN_NET
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          FIVB Women (2.24m)
        </button>
        <button
          onClick={() => setShowCustom(true)}
          className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
            showCustom
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Custom
        </button>

        {showCustom && (
          <div className="mt-1">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Height (m)
            </label>
            <input
              type="number"
              min={1.0}
              max={3.5}
              step={0.01}
              value={net.heightM}
              onChange={(e) => updateNet({ heightM: Number(e.target.value) })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
        )}
      </div>
    </div>
  )
}
