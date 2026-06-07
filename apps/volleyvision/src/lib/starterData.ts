import type { Folder, Preset } from '../store/useStore'

export const STARTER_PRESETS: Preset[] = [
  {
    id: 'mq3p5cli',
    name: 'Example 1',
    schemaVersion: 1,
    mode: 'setting',
    setterPosition: [0.885427120952293, -1.5472914828911],
    setter: { heightM: 1.83, jumpSet: true },
    net: { heightM: 2.43 },
    trajectory: {
      landingPosition: [0.2946962117698406, 6.332331767178579],
      peakHeight: 3.5996939730521222,
      contactProgress: 0.6669128192434466,
    },
  },
  {
    id: 'mq3pakff',
    name: 'Example 2',
    schemaVersion: 1,
    mode: 'setting',
    setterPosition: [0.885427120952293, -1.5472914828911],
    setter: { heightM: 1.83, jumpSet: true },
    net: { heightM: 2.43 },
    trajectory: {
      landingPosition: [0.359744714938228, 5.592168333624496],
      peakHeight: 4.441822690083529,
      contactProgress: 0.7673070962625178,
    },
  },
  {
    id: 'mq3phbif',
    name: 'Example 1',
    schemaVersion: 1,
    mode: 'setting',
    setterPosition: [0.5237957490827, -1.3026109649114286],
    setter: { heightM: 1.83, jumpSet: true },
    net: { heightM: 2.43 },
    trajectory: {
      landingPosition: [0.1850281388984394, 0.35388110856823835],
      peakHeight: 3.0537299906902025,
      contactProgress: 0.4746834714569541,
    },
  },
  {
    id: 'mq3pi7cu',
    name: 'Example 2',
    schemaVersion: 1,
    mode: 'setting',
    setterPosition: [0.5237957490827, -1.3026109649114286],
    setter: { heightM: 1.83, jumpSet: true },
    net: { heightM: 2.43 },
    trajectory: {
      landingPosition: [0.3352683119335307, 2.920142368277612],
      peakHeight: 3.0648568409503762,
      contactProgress: 0.48094742537674456,
    },
  },
  {
    id: 'mq3pkf1r',
    name: 'Example 1',
    schemaVersion: 1,
    mode: 'setting',
    setterPosition: [0.885427120952293, -1.5472914828911],
    setter: { heightM: 1.83, jumpSet: true },
    net: { heightM: 2.43 },
    trajectory: {
      landingPosition: [0.22370188237892252, -4.8004759521814355],
      peakHeight: 4.166983315656358,
      contactProgress: 0.7429668582011116,
    },
  },
]

export const STARTER_FOLDERS: Folder[] = [
  {
    id: 'unsorted',
    name: 'General',
    presetIds: [],
    maxReachM: null,
  },
  {
    id: 'mq2hqqm9_f',
    name: 'OH1',
    presetIds: ['mq3p5cli', 'mq3pakff'],
    maxReachM: 2.8,
  },
  {
    id: 'mq3mx51m_f',
    name: 'MB1',
    presetIds: ['mq3phbif', 'mq3pi7cu'],
    maxReachM: 2.9,
  },
  {
    id: 'mq3mxb9j_f',
    name: 'OPP',
    presetIds: ['mq3pkf1r'],
    maxReachM: 2.8,
  },
]
