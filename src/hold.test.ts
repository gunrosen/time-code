import { describe, expect, it } from 'vitest';
import { createHoldMachine } from './hold';

const HOLD = 1000;

describe('hold machine', () => {
  it('cancels a press released before the threshold', () => {
    const m = createHoldMachine(HOLD);
    m.press(100);
    expect(m.update(600)).toBeNull();
    expect(m.progress(600)).toBe(0.5);
    m.release();
    expect(m.update(1500)).toBeNull();
    expect(m.progress(1500)).toBe(0);
  });

  it('toggles once as soon as the threshold is reached, without waiting for release', () => {
    const m = createHoldMachine(HOLD);
    m.press(100);
    expect(m.update(1100)).toEqual({ startedAt: 100 });
    expect(m.update(1500)).toBeNull();
    expect(m.progress(1500)).toBe(0);
    m.release();
    m.press(2000);
    expect(m.update(3000)).toEqual({ startedAt: 2000 });
  });

  it('ignores extra presses during a hold and drops aborted holds', () => {
    const m = createHoldMachine(HOLD);
    m.press(0);
    m.press(500);
    m.abort();
    expect(m.update(2000)).toBeNull();
  });
});
