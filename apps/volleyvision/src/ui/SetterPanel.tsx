import { useStore } from '../store/useStore'

export default function SetterPanel() {
  const setter = useStore((s) => s.setter)
  const updateSetter = useStore((s) => s.updateSetter)
  const setActivePanel = useStore((s) => s.setActivePanel)

  return (
    <div className="absolute top-16 right-4 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 z-20">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Setter</h2>
        <button
          onClick={() => setActivePanel(null)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
          Height: {Math.round(setter.heightM * 100)} cm
        </label>
        <input
          type="range"
          min={160}
          max={215}
          value={Math.round(setter.heightM * 100)}
          onChange={(e) => updateSetter({ heightM: Number(e.target.value) / 100 })}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>160</span>
          <span>215</span>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
          Set type
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => updateSetter({ jumpSet: false })}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              !setter.jumpSet
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Standing
          </button>
          <button
            onClick={() => updateSetter({ jumpSet: true })}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              setter.jumpSet
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Jump Set
          </button>
        </div>
      </div>
    </div>
  )
}
