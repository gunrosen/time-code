import { describe, expect, it } from 'vitest';
import { createClock, formatDate, formatOffset, formatTime, toSnapshot } from './clock';

// 2026-10-19T07:32:07.483Z
const EPOCH = Date.UTC(2026, 9, 19, 7, 32, 7, 483);
const ICT = 420; // UTC+07:00

describe('toSnapshot', () => {
  it('splits time into slot start and phase', () => {
    const s = toSnapshot(EPOCH, () => ICT);
    expect(s.slotStartMs).toBe(EPOCH - 83);
    expect(s.phaseMs).toBeCloseTo(83);
    expect(s.tzOffsetMin).toBe(ICT);
  });

  it('keeps phase within [0, SLOT_MS) across a slot boundary', () => {
    const end = toSnapshot(EPOCH - 483 + 99.9, () => 0);
    const start = toSnapshot(EPOCH - 483 + 100, () => 0);
    expect(end.phaseMs).toBeCloseTo(99.9);
    expect(start.phaseMs).toBe(0);
    expect(start.slot).toBe(end.slot + 1);
  });

  it('counts slots from local midnight', () => {
    // 2026-10-19T17:00:00Z is 00:00 local in UTC+07:00.
    const midnight = Date.UTC(2026, 9, 19, 17, 0, 0, 0);
    expect(toSnapshot(midnight, () => ICT).slotOfDay).toBe(0);
    expect(toSnapshot(midnight - 1, () => ICT).slotOfDay).toBe(863_999);
    expect(toSnapshot(midnight + 250, () => ICT).slotOfDay).toBe(2);
  });

  it('handles negative offsets', () => {
    // 2026-10-19T04:00:00Z is 00:00 local in UTC-04:00.
    const midnight = Date.UTC(2026, 9, 19, 4, 0, 0, 0);
    expect(toSnapshot(midnight, () => -240).slotOfDay).toBe(0);
  });
});

describe('formatting', () => {
  it('formats local time of the slot start with tenths', () => {
    expect(formatTime(toSnapshot(EPOCH, () => ICT))).toBe('14:32:07.4');
    expect(formatTime(toSnapshot(EPOCH, () => 0))).toBe('07:32:07.4');
  });

  it('formats local date', () => {
    const lateUtc = Date.UTC(2026, 9, 19, 20, 0, 0, 0);
    expect(formatDate(toSnapshot(lateUtc, () => ICT))).toBe('2026-10-20');
    expect(formatDate(toSnapshot(lateUtc, () => 0))).toBe('2026-10-19');
  });

  it('formats UTC offsets', () => {
    expect(formatOffset(420)).toBe('UTC+07:00');
    expect(formatOffset(-570)).toBe('UTC-09:30');
    expect(formatOffset(0)).toBe('UTC+00:00');
  });
});

describe('createClock', () => {
  it('maps rAF timestamps onto the wall clock anchored at creation', () => {
    let wall = 1_000_000;
    let perf = 500;
    const clock = createClock(() => wall, () => perf);
    expect(clock.epochAt(600)).toBe(1_000_100);

    wall = 2_000_000;
    perf = 700;
    expect(clock.epochAt(700)).toBe(1_000_200);
    clock.reanchor();
    expect(clock.epochAt(700)).toBe(2_000_000);
  });
});
