import type { Folder, Preset } from '../store/useStore'

export const STARTER_PRESETS: Preset[] = [
  {
    id: 'starter_quick',
    name: 'Quick',
    schemaVersion: 1,
    mode: 'setting',
    setterPosition: [0.8580054159198962, -1.9839190596288956],
    setter: { heightM: 1.64, jumpSet: true },
    net: { heightM: 2.43 },
    trajectory: {
      landingPosition: [0.8587935788443914, 1.6727221705426594],
      peakHeight: 3.1673098475685526,
      contactProgress: 0.7,
    },
  },
  {
    id: 'starter_metre',
    name: 'Metre',
    schemaVersion: 1,
    mode: 'setting',
    setterPosition: [0.8580054159198962, -1.9839190596288956],
    setter: { heightM: 1.64, jumpSet: true },
    net: { heightM: 2.43 },
    trajectory: {
      landingPosition: [0.8587935788443914, 1.6727221705426594],
      peakHeight: 3.747329020709332,
      contactProgress: 0.7,
    },
  },
  {
    id: 'starter_quick_c',
    name: 'Quick-C',
    schemaVersion: 1,
    mode: 'setting',
    setterPosition: [0.8580054159198962, -1.9839190596288956],
    setter: { heightM: 1.64, jumpSet: true },
    net: { heightM: 2.43 },
    trajectory: {
      landingPosition: [1.03949412486962, -4.4],
      peakHeight: 3.135937991857277,
      contactProgress: 0.7,
    },
  },
  {
    id: 'starter_opponent_gap',
    name: 'Opponent Gap',
    schemaVersion: 1,
    mode: 'setting',
    setterPosition: [1.5059019811335492, -0.3894706171739455],
    setter: { heightM: 1.64, jumpSet: true },
    net: { heightM: 2.43 },
    trajectory: {
      landingPosition: [-4.361704370046414, 2.8372799767277193],
      peakHeight: 3.5,
      contactProgress: 0.7,
    },
  },
]

export const STARTER_FOLDERS: Folder[] = [
  {
    id: 'starter_middle_sets',
    name: 'Middle Sets',
    presetIds: ['starter_quick', 'starter_metre', 'starter_quick_c'],
  },
]
