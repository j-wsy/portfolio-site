export const COURT_LENGTH = 18   // X: -9 to +9
export const COURT_WIDTH = 9     // Z: -4.5 to +4.5
export const ATTACK_LINE = 3     // X = +/-3

export const ALLY_X_MIN = 0.1
export const ALLY_X_MAX = 8.9
export const ALLY_Z_MIN = -4.4
export const ALLY_Z_MAX = 4.4

export const OPP_X_MIN = -8.9
export const OPP_X_MAX = -0.1
export const OPP_Z_MIN = -4.4
export const OPP_Z_MAX = 4.4

// wider bounds for intentionally off-court set placement
export const COURT_X_MIN = -8.9
export const COURT_X_MAX = 8.9
export const COURT_Z_MIN = -4.4
export const COURT_Z_MAX = 4.4
export const OUTER_X_MIN = -16
export const OUTER_X_MAX = 16
export const OUTER_Z_MIN = -11
export const OUTER_Z_MAX = 11
export const SET_X_MIN = OUTER_X_MIN
export const SET_X_MAX = OUTER_X_MAX
export const SET_Z_MIN = OUTER_Z_MIN
export const SET_Z_MAX = OUTER_Z_MAX

export const NET_DEPTH = 1.0         // vertical extent of the net mesh (m)
export const POLE_OFFSET = 1.14      // poles sit this far outside the sideline
export const ANTENNA_ABOVE = 0.8    // antenna extends above net top (m)

export const FIVB_MEN_NET = 2.43
export const FIVB_WOMEN_NET = 2.24
export const DEFAULT_NET_HEIGHT = FIVB_MEN_NET

export const MIN_SETTER_HEIGHT = 1.0
export const DEFAULT_SETTER_HEIGHT = 1.80
export const DEFAULT_PEAK_HEIGHT = 3.5
export const MAX_PEAK_HEIGHT = 8.0

export const ARC_STEPS = 60
