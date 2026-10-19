import { formatTime, localOffset, toSnapshot, type OffsetFn } from './clock';
import { HOLD_MS, TAG_STORAGE_KEY } from './config';

export type TagState = 'IDLE' | 'START' | 'STOP';

export type Tag = {
  state: TagState;
  // Epoch ms when the hold that set this state began; 0 while IDLE.
  eventMs: number;
};

export type TagStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const IDLE_TAG: Tag = { state: 'IDLE', eventMs: 0 };

const STATES: readonly TagState[] = ['IDLE', 'START', 'STOP'];

export function nextTag(current: Tag, eventMs: number): Tag {
  return { state: current.state === 'START' ? 'STOP' : 'START', eventMs: Math.floor(eventMs) };
}

export function formatTagLabel(tag: Tag, offsetOf: OffsetFn = localOffset): string {
  if (tag.state === 'IDLE') return `Nhấn giữ ${HOLD_MS / 1000} giây để START`;
  const time = formatTime(toSnapshot(tag.eventMs, offsetOf));
  return tag.state === 'START' ? `▶ START · từ ${time}` : `■ STOP · từ ${time}`;
}

// localStorage can be missing or throw (private mode, blocked site data).
export function browserStorage(): TagStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadTag(storage: TagStorage | null): Tag {
  try {
    const raw = storage?.getItem(TAG_STORAGE_KEY);
    if (!raw) return IDLE_TAG;
    const parsed: Partial<Tag> = JSON.parse(raw);
    const { state, eventMs } = parsed;
    if (state === undefined || !STATES.includes(state) || typeof eventMs !== 'number') return IDLE_TAG;
    return { state, eventMs };
  } catch {
    return IDLE_TAG;
  }
}

export function saveTag(tag: Tag, storage: TagStorage | null): void {
  try {
    storage?.setItem(TAG_STORAGE_KEY, JSON.stringify(tag));
  } catch {
    // Persistence is a convenience; the tag still works for this session.
  }
}
