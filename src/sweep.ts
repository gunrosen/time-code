import { SLOT_MS } from './config';

const MAJOR_TICK_MS = 10;
const MINOR_TICK_MS = 5;
const TRACK_RATIO = 0.62;
const BAR_WIDTH_RATIO = 0.015;
const PAD_RATIO = 0.02;

// Ruler 0..SLOT_MS with a bar at the current phase. Under a long exposure the bar
// smears into a streak whose centre is the mid-exposure time.
export function drawSweep(ctx: CanvasRenderingContext2D, phaseMs: number): void {
  const { width, height } = ctx.canvas;
  const pad = Math.round(width * PAD_RATIO);
  const trackW = width - pad * 2;
  const trackH = Math.round(height * TRACK_RATIO);
  const xAt = (ms: number) => pad + (ms / SLOT_MS) * trackW;
  const line = Math.max(1, Math.round(width / 800));

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#161616';
  ctx.fillRect(pad, 0, trackW, trackH);

  for (let ms = 0; ms <= SLOT_MS; ms += MINOR_TICK_MS) {
    const major = ms % MAJOR_TICK_MS === 0;
    const tickH = major ? trackH : Math.round(trackH * 0.35);
    ctx.fillStyle = major ? '#8a8a8a' : '#4a4a4a';
    ctx.fillRect(Math.round(xAt(ms) - line / 2), trackH - tickH, line, tickH);
  }

  const fontPx = Math.floor(Math.min((height - trackH) * 0.8, trackW / 22));
  ctx.fillStyle = '#d0d0d0';
  ctx.font = `700 ${fontPx}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let ms = 0; ms < SLOT_MS; ms += MAJOR_TICK_MS) {
    ctx.fillText(String(ms), xAt(ms), trackH + Math.round((height - trackH - fontPx) / 2));
  }

  const barW = Math.max(4, Math.round(width * BAR_WIDTH_RATIO));
  ctx.fillStyle = '#ffd400';
  ctx.fillRect(Math.round(xAt(phaseMs) - barW / 2), 0, barW, trackH);
}
