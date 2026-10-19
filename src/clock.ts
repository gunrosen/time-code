import { MS_PER_DAY, MS_PER_MINUTE, SLOT_MS } from './config';

export type Snapshot = {
  epochMs: number;
  slot: number;
  slotStartMs: number;
  phaseMs: number;
  // Local offset from UTC in minutes, positive east of Greenwich (UTC+07:00 = 420).
  tzOffsetMin: number;
  // Slot index counted from local midnight.
  slotOfDay: number;
};

export type OffsetFn = (epochMs: number) => number;

export const localOffset: OffsetFn = (epochMs) => -new Date(epochMs).getTimezoneOffset();

export function toSnapshot(epochMs: number, offsetOf: OffsetFn = localOffset): Snapshot {
  const slot = Math.floor(epochMs / SLOT_MS);
  const slotStartMs = slot * SLOT_MS;
  const tzOffsetMin = offsetOf(slotStartMs);
  const msOfDay = mod(slotStartMs + tzOffsetMin * MS_PER_MINUTE, MS_PER_DAY);
  return {
    epochMs,
    slot,
    slotStartMs,
    phaseMs: epochMs - slotStartMs,
    tzOffsetMin,
    slotOfDay: Math.floor(msOfDay / SLOT_MS),
  };
}

// HH:MM:SS.d of the slot start in local time.
export function formatTime(s: Snapshot): string {
  const msOfDay = s.slotOfDay * SLOT_MS;
  const h = Math.floor(msOfDay / 3_600_000);
  const m = Math.floor(msOfDay / 60_000) % 60;
  const sec = Math.floor(msOfDay / 1000) % 60;
  const tenths = Math.floor(msOfDay / 100) % 10;
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${tenths}`;
}

export function formatDate(s: Snapshot): string {
  const local = new Date(s.slotStartMs + s.tzOffsetMin * MS_PER_MINUTE);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

export function formatOffset(tzOffsetMin: number): string {
  const sign = tzOffsetMin < 0 ? '-' : '+';
  const abs = Math.abs(tzOffsetMin);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function timeZoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export type Clock = {
  epochAt: (rafTimestamp: number) => number;
  reanchor: () => void;
};

// rAF timestamps share the performance.now() timebase; anchoring once keeps the
// displayed time monotonic instead of jumping with every Date.now() adjustment.
export function createClock(
  wallNow: () => number = () => Date.now(),
  perfNow: () => number = () => performance.now(),
): Clock {
  let anchor = wallNow() - perfNow();
  return {
    epochAt: (rafTimestamp) => anchor + rafTimestamp,
    reanchor: () => {
      anchor = wallNow() - perfNow();
    },
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
