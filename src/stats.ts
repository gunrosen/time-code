import { DROP_FACTOR, RECENT_DROP_MS, STATS_MIN_SAMPLES, STATS_WINDOW } from './config';

export type FrameStats = {
  push: (timestamp: number) => void;
  reset: () => void;
  hz: () => number;
  dropped: () => number;
  recentDrop: (now: number) => boolean;
};

export function createFrameStats(): FrameStats {
  const deltas: number[] = [];
  let last: number | null = null;
  let median = 0;
  let dropped = 0;
  let lastDropAt = Number.NEGATIVE_INFINITY;

  function push(timestamp: number): void {
    if (last !== null) {
      const delta = timestamp - last;
      if (deltas.length >= STATS_MIN_SAMPLES && delta > median * DROP_FACTOR) {
        dropped++;
        lastDropAt = timestamp;
      } else {
        // Dropped deltas stay out of the window so they cannot skew the median.
        deltas.push(delta);
        if (deltas.length > STATS_WINDOW) deltas.shift();
        median = medianOf(deltas);
      }
    }
    last = timestamp;
  }

  return {
    push,
    // Call after the page was hidden, so the gap is not counted as a drop.
    reset: () => {
      last = null;
    },
    hz: () => (median > 0 ? Math.round(1000 / median) : 0),
    dropped: () => dropped,
    recentDrop: (now) => now - lastDropAt < RECENT_DROP_MS,
  };
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
