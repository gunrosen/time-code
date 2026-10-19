export type Hold = {
  // 0..1 while a hold is in progress, 0 otherwise. `now` uses the performance.now() timebase.
  progress: (now: number) => number;
};

// Press and hold anywhere (pointer or Space) for holdMs to fire onComplete with the
// time the hold began. Releasing early cancels; a new hold needs a new press.
export function setupHold(holdMs: number, onComplete: (startedAt: number) => void): Hold {
  const root = document.documentElement;
  let startedAt: number | null = null;
  let timer = 0;

  const begin = (timeStamp: number) => {
    if (startedAt !== null) return;
    startedAt = timeStamp;
    timer = window.setTimeout(() => {
      const start = startedAt;
      startedAt = null;
      if (start !== null) onComplete(start);
    }, Math.max(0, holdMs - (performance.now() - timeStamp)));
  };
  const cancel = () => {
    startedAt = null;
    window.clearTimeout(timer);
  };

  root.addEventListener('pointerdown', (e) => {
    if (e.isPrimary) begin(e.timeStamp);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
    root.addEventListener(type, (e) => {
      if (e.isPrimary) cancel();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (!e.repeat) begin(e.timeStamp);
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') cancel();
  });

  // Long-press on touch screens would otherwise open the context menu.
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    progress: (now) => (startedAt === null ? 0 : Math.min(1, Math.max(0, (now - startedAt) / holdMs))),
  };
}
