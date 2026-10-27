import { describe, expect, it } from 'vitest';
import { QR_PREFIX } from './config';
import { buildPayload, buildQr } from './qr';
import { OTHER_CODE, SECTIONS, TASKS, filterTasks, findTask, fold, loadTaskCode, saveTaskCode, type Task } from './tasks';

function memoryStorage() {
  const data: Record<string, string> = {};
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
  };
}

const SAMPLE: Task[] = [
  {
    code: 'V22',
    name: 'Thư từ - chuẩn bị bộ gửi',
    section: 'general',
    sources: ['kichban'],
    variantOf: null,
    steps: [
      { code: 'V22-1', order: 1, nameVi: 'Gấp tài liệu', nameEn: 'Fold letters', description: '', props: [], wristcamNote: null },
    ],
  },
  {
    code: 'P02',
    name: 'Bột - rây và chia hộp',
    section: 'plan',
    sources: ['plan'],
    variantOf: null,
    steps: [{ code: 'P02-1', order: 1, nameVi: 'Cho bột vào rây', nameEn: null, description: '', props: [], wristcamNote: null }],
  },
];

describe('catalog', () => {
  it('has unique QR-safe codes, 5 ordered steps each and known sections', () => {
    const codes = TASKS.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
    const sectionIds = new Set(SECTIONS.map((s) => s.id));
    for (const t of TASKS) {
      expect(t.code).toMatch(/^[0-9A-Z-]{1,8}$/);
      expect(sectionIds.has(t.section)).toBe(true);
      if (t.code === OTHER_CODE) continue;
      expect(t.steps.map((s) => s.order)).toEqual([1, 2, 3, 4, 5]);
      for (const s of t.steps) expect(s.code).toBe(`${t.code}-${s.order}`);
      if (t.variantOf !== null) expect(findTask(t.variantOf)).not.toBeNull();
    }
  });

  it('puts the OTHER fallback first, without steps', () => {
    expect(TASKS[0]?.code).toBe(OTHER_CODE);
    expect(TASKS[0]?.steps).toEqual([]);
    expect(SECTIONS[0]?.id).toBe(TASKS[0]?.section);
  });

  it('keeps the KichBan rounds and the plan-only tasks', () => {
    expect(findTask('V22')?.name).toBe('Thư từ - chuẩn bị bộ gửi');
    expect(findTask('V76')).not.toBeNull();
    expect(findTask('P01')?.variantOf).toBe('V04');
    expect(findTask('nope')).toBeNull();
  });

  it('fits every task code in the fixed QR version', () => {
    for (const t of TASKS) {
      const payload = buildPayload(9_999_999_999_900, -720, { state: 'START', eventMs: 9_999_999_999_999 }, t.code);
      expect(payload.startsWith(`${QR_PREFIX}:`)).toBe(true);
      expect(buildQr(payload).modules.size).toBe(29);
    }
  });
});

describe('filterTasks', () => {
  it('matches code, name and step names without diacritics', () => {
    expect(fold('Thư từ Đ')).toBe('thu tu d');
    expect(filterTasks('', SAMPLE).map((t) => t.code)).toEqual(['V22', 'P02']);
    expect(filterTasks('v22', SAMPLE).map((t) => t.code)).toEqual(['V22']);
    expect(filterTasks('thu tu', SAMPLE).map((t) => t.code)).toEqual(['V22']);
    expect(filterTasks('fold letters', SAMPLE).map((t) => t.code)).toEqual(['V22']);
    expect(filterTasks('bot ray', SAMPLE).map((t) => t.code)).toEqual(['P02']);
    expect(filterTasks('xyz', SAMPLE)).toEqual([]);
  });
});

describe('task storage', () => {
  it('round-trips a known code and drops unknown or cleared ones', () => {
    const storage = memoryStorage();
    saveTaskCode('V22', storage);
    expect(loadTaskCode(storage, SAMPLE)).toBe('V22');
    saveTaskCode(null, storage);
    expect(loadTaskCode(storage, SAMPLE)).toBeNull();
    storage.setItem('timecode.task', 'V99');
    expect(loadTaskCode(storage, SAMPLE)).toBeNull();
    expect(loadTaskCode(null, SAMPLE)).toBeNull();
  });
});
