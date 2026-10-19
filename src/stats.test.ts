import { describe, expect, it } from 'vitest';
import { createFrameStats } from './stats';

function feed(stats: ReturnType<typeof createFrameStats>, deltas: number[], start = 0): number {
  let ts = start;
  stats.push(ts);
  for (const d of deltas) {
    ts += d;
    stats.push(ts);
  }
  return ts;
}

describe('frame stats', () => {
  it('estimates the refresh rate from the median delta', () => {
    const stats = createFrameStats();
    feed(stats, Array(30).fill(1000 / 60));
    expect(stats.hz()).toBe(60);
    expect(stats.dropped()).toBe(0);
  });

  it('counts long deltas as dropped frames', () => {
    const stats = createFrameStats();
    const ts = feed(stats, [...Array(30).fill(1000 / 60), 50, ...Array(5).fill(1000 / 60)]);
    expect(stats.dropped()).toBe(1);
    expect(stats.hz()).toBe(60);
    expect(stats.recentDrop(ts)).toBe(true);
    expect(stats.recentDrop(ts + 5000)).toBe(false);
  });

  it('ignores the gap after reset', () => {
    const stats = createFrameStats();
    const ts = feed(stats, Array(30).fill(1000 / 60));
    stats.reset();
    feed(stats, Array(30).fill(1000 / 60), ts + 10_000);
    expect(stats.dropped()).toBe(0);
  });
});
