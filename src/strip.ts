import { GRAY_BITS } from './config';
import { toBits, toGray } from './gray';

// White/black reference cells at both ends give the reader a threshold and a direction.
const LEAD = [true, false];
const TRAIL = [false, true];
const CELLS = LEAD.length + GRAY_BITS + TRAIL.length;
const GAP_RATIO = 0.08;

export function stripCells(slotOfDay: number): boolean[] {
  return [...LEAD, ...toBits(toGray(slotOfDay), GRAY_BITS), ...TRAIL];
}

// Lays the cells out in one row, or two when that gives bigger cells (narrow screens).
export function drawStrip(ctx: CanvasRenderingContext2D, slotOfDay: number): void {
  const { width, height } = ctx.canvas;
  const oneRow = Math.min(width / CELLS, height);
  const twoRows = Math.min(width / (CELLS / 2), height / 2);
  const rows = twoRows > oneRow ? 2 : 1;
  const cols = CELLS / rows;
  const cell = Math.floor(Math.max(oneRow, twoRows));
  const gap = Math.max(1, Math.round(cell * GAP_RATIO));
  const x0 = Math.floor((width - cols * cell) / 2);
  const y0 = Math.floor((height - rows * cell) / 2);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  stripCells(slotOfDay).forEach((on, i) => {
    const x = x0 + (i % cols) * cell;
    const y = y0 + Math.floor(i / cols) * cell;
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x, y, cell, cell);
    ctx.fillStyle = on ? '#fff' : '#000';
    ctx.fillRect(x + gap, y + gap, cell - gap * 2, cell - gap * 2);
  });
}
