import { describe, expect, it } from 'vitest';
import { GRAY_BITS, MS_PER_DAY, SLOT_MS } from './config';
import { fromGray, toBits, toGray } from './gray';

const SLOTS_PER_DAY = MS_PER_DAY / SLOT_MS;

function popcount(n: number): number {
  let count = 0;
  for (let v = n; v; v >>>= 1) count += v & 1;
  return count;
}

describe('gray', () => {
  it('round-trips every slot of a day', () => {
    for (let n = 0; n < SLOTS_PER_DAY; n++) {
      expect(fromGray(toGray(n))).toBe(n);
    }
  });

  it('changes exactly one bit between adjacent slots', () => {
    for (let n = 0; n + 1 < SLOTS_PER_DAY; n++) {
      expect(popcount(toGray(n) ^ toGray(n + 1))).toBe(1);
    }
  });

  it('fits every slot of a day in GRAY_BITS', () => {
    expect(toGray(SLOTS_PER_DAY - 1) < 2 ** GRAY_BITS).toBe(true);
  });

  it('emits bits MSB first', () => {
    expect(toBits(0b1011, 6)).toEqual([false, false, true, false, true, true]);
  });
});
