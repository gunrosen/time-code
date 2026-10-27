import { TASK_STORAGE_KEY } from './config';
import type { TagStorage } from './tag';
import catalog from './tasks.json';

export type Step = {
  code: string;
  order: number;
  nameVi: string;
  nameEn: string | null;
  description: string;
  props: string[];
  wristcamNote: string | null;
};

export type Task = {
  code: string;
  name: string;
  section: string;
  sources: string[];
  variantOf: string | null;
  steps: Step[];
};

export type Section = { id: string; name: string };

export const SECTIONS: readonly Section[] = catalog.sections;
export const TASKS: readonly Task[] = catalog.tasks;
// Fallback task for a recording that matches nothing in the catalog; it has no steps.
export const OTHER_CODE = 'OTHER';

export function findTask(code: string | null, tasks: readonly Task[] = TASKS): Task | null {
  if (!code) return null;
  return tasks.find((t) => t.code === code) ?? null;
}

// Lowercase without diacritics, so "khan" matches "Khăn".
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

// Every word of the query must appear in the code, the name or a step name.
export function filterTasks(query: string, tasks: readonly Task[] = TASKS): Task[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...tasks];
  return tasks.filter((t) => {
    const hay = fold([t.code, t.name, ...t.steps.flatMap((s) => [s.nameVi, s.nameEn ?? ''])].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

export function loadTaskCode(storage: TagStorage | null, tasks: readonly Task[] = TASKS): string | null {
  try {
    const code = storage?.getItem(TASK_STORAGE_KEY) ?? null;
    return findTask(code, tasks)?.code ?? null;
  } catch {
    return null;
  }
}

export function saveTaskCode(code: string | null, storage: TagStorage | null): void {
  try {
    if (code === null) storage?.removeItem(TASK_STORAGE_KEY);
    else storage?.setItem(TASK_STORAGE_KEY, code);
  } catch {
    // Persistence is a convenience; the selection still works for this session.
  }
}
