// Coarse layer: time digits, Gray strip and QR change once per slot.
export const SLOT_MS = 100;
// Enough bits for every slot in a day (86_400_000 / SLOT_MS = 864_000 < 2^20).
export const GRAY_BITS = 20;
export const QR_PREFIX = 'TC3';
// Fixed QR version keeps the module grid size stable across payloads.
export const QR_VERSION = 3;
export const QR_QUIET_ZONE = 4;

// A frame counts as dropped when its delta exceeds this multiple of the median delta.
export const DROP_FACTOR = 1.5;
export const STATS_WINDOW = 120;
export const STATS_MIN_SAMPLES = 10;
export const RECENT_DROP_MS = 2000;
export const STATUS_REFRESH_MS = 500;

export const CURSOR_HIDE_MS = 3000;

// Task tag: press and hold anywhere this long to toggle START/STOP.
export const HOLD_MS = 1000;
export const HOLD_VIBRATE_MS = 60;
export const TAG_STORAGE_KEY = 'timecode.tag';

export const MS_PER_DAY = 86_400_000;
export const MS_PER_MINUTE = 60_000;
