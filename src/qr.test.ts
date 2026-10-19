import { describe, expect, it } from 'vitest';
import { buildPayload, buildQr } from './qr';
import { IDLE_TAG } from './tag';

describe('qr', () => {
  it('builds the TC3 payload', () => {
    expect(buildPayload(1_792_345_678_900, 420, IDLE_TAG)).toBe('TC3:1792345678900:420:IDLE:0');
    expect(buildPayload(1_792_345_678_900, -570, { state: 'START', eventMs: 1_792_345_670_123 })).toBe(
      'TC3:1792345678900:-570:START:1792345670123',
    );
  });

  it('encodes the longest payload at the fixed version', () => {
    const payload = buildPayload(9_999_999_999_900, -720, { state: 'START', eventMs: 9_999_999_999_999 });
    expect(buildQr(payload).modules.size).toBe(29);
  });
});
