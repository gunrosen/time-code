import { describe, expect, it } from 'vitest';
import { createConfirm } from './confirm';

describe('confirm', () => {
  it('needs a second tap within the window', () => {
    const c = createConfirm(3000);
    expect(c.tap(0)).toBe('armed');
    expect(c.isArmed(2999)).toBe(true);
    expect(c.tap(2000)).toBe('confirmed');
    expect(c.isArmed(2000)).toBe(false);
  });

  it('starts over after the window expires', () => {
    const c = createConfirm(3000);
    c.tap(0);
    expect(c.isArmed(3000)).toBe(false);
    expect(c.tap(3500)).toBe('armed');
    expect(c.tap(4000)).toBe('confirmed');
  });
});
