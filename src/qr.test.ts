import { describe, expect, it } from 'vitest';
import { buildPayload, buildQr } from './qr';

describe('qr', () => {
  it('builds the TC2 payload', () => {
    expect(buildPayload(1_792_345_678_900, 420)).toBe('TC2;1792345678900;420');
    expect(buildPayload(1_792_345_678_900, -570)).toBe('TC2;1792345678900;-570');
  });

  it('encodes the longest payload at the fixed version', () => {
    const qr = buildQr(buildPayload(9_999_999_999_900, -720));
    expect(qr.modules.size).toBe(25);
  });
});
