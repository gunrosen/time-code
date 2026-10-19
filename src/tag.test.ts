import { describe, expect, it } from 'vitest';
import { IDLE_TAG, formatTagLabel, loadTag, nextTag, saveTag, type Tag } from './tag';

// 2026-10-19T05:30:05.234Z = 12:30:05.2 in UTC+07:00
const EVENT = Date.UTC(2026, 9, 19, 5, 30, 5, 234);

function memoryStorage() {
  const data: Record<string, string> = {};
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe('nextTag', () => {
  it('cycles IDLE → START → STOP → START with the hold start time', () => {
    const a = nextTag(IDLE_TAG, EVENT + 0.4);
    expect(a).toEqual({ state: 'START', eventMs: EVENT });
    const b = nextTag(a, EVENT + 60_000);
    expect(b).toEqual({ state: 'STOP', eventMs: EVENT + 60_000 });
    expect(nextTag(b, EVENT + 90_000).state).toBe('START');
  });
});

describe('formatTagLabel', () => {
  it('shows the prompt while idle', () => {
    expect(formatTagLabel(IDLE_TAG)).toBe('Nhấn giữ 1 giây để START');
  });

  it('shows state and local event time', () => {
    expect(formatTagLabel({ state: 'START', eventMs: EVENT }, () => 420)).toBe('▶ START · từ 12:30:05.2');
    expect(formatTagLabel({ state: 'STOP', eventMs: EVENT }, () => 0)).toBe('■ STOP · từ 05:30:05.2');
  });
});

describe('tag storage', () => {
  it('round-trips a saved tag', () => {
    const storage = memoryStorage();
    const tag: Tag = { state: 'STOP', eventMs: EVENT };
    saveTag(tag, storage);
    expect(loadTag(storage)).toEqual(tag);
  });

  it('falls back to IDLE for missing, corrupt or invalid data', () => {
    expect(loadTag(memoryStorage())).toEqual(IDLE_TAG);
    expect(loadTag(null)).toEqual(IDLE_TAG);
    for (const raw of ['not json', '{"state":"PAUSE","eventMs":1}', '{"state":"START","eventMs":"x"}']) {
      expect(loadTag({ getItem: () => raw, setItem: () => undefined })).toEqual(IDLE_TAG);
    }
  });
});
