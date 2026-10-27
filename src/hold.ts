// Press and hold anywhere for holdMs to toggle START/STOP. Releasing earlier cancels.
// Times use the performance.now() timebase.

export type HoldResult = {
  startedAt: number;
};

export type HoldMachine = {
  press: (now: number) => void;
  release: () => void;
  abort: () => void;
  // Call every frame; reports the toggle once, as soon as the hold is long enough.
  update: (now: number) => HoldResult | null;
  // 0..1 while a hold is in progress, 0 otherwise.
  progress: (now: number) => number;
};

export function createHoldMachine(holdMs: number): HoldMachine {
  let startedAt: number | null = null;
  // A hold that already toggled must be released before the next one starts.
  let spent = false;

  const clear = () => {
    startedAt = null;
    spent = false;
  };

  return {
    press: (now) => {
      if (startedAt !== null) return;
      startedAt = now;
      spent = false;
    },
    release: clear,
    abort: clear,
    update: (now) => {
      if (startedAt === null || spent || now - startedAt < holdMs) return null;
      spent = true;
      return { startedAt };
    },
    progress: (now) => {
      if (startedAt === null || spent) return 0;
      return Math.min(1, Math.max(0, (now - startedAt) / holdMs));
    },
  };
}

// Elements marked with data-no-hold (e.g. buttons) do not start a hold.
const NO_HOLD = '[data-no-hold]';

// Feeds pointer and Space key events into the machine.
export function bindHoldInput(machine: HoldMachine): void {
  const root = document.documentElement;

  root.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    if (e.target instanceof Element && e.target.closest(NO_HOLD)) return;
    machine.press(e.timeStamp);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel'] as const) {
    root.addEventListener(type, (e) => {
      if (e.isPrimary) machine.release();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    // Space typed into the task search box (inside data-no-hold) is not a hold.
    if (e.target instanceof Element && e.target.closest(NO_HOLD)) return;
    e.preventDefault();
    if (!e.repeat) machine.press(e.timeStamp);
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') machine.release();
  });

  // Long-press on touch screens would otherwise open the context menu.
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
