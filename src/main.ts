import { createClock, formatDate, formatOffset, formatTime, timeZoneName, toSnapshot } from './clock';
import { STATUS_REFRESH_MS } from './config';
import { setupControls } from './controls';
import { buildPayload, buildQr, drawQr } from './qr';
import { createFrameStats } from './stats';
import { drawStrip } from './strip';
import { drawSweep } from './sweep';

function byId<T extends HTMLElement>(id: string, type: { new (): T; prototype: T }): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) throw new Error(`#${id} is missing`);
  return el;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not supported');
  return ctx;
}

const dateEl = byId('date', HTMLElement);
const tzEl = byId('tz', HTMLElement);
const timeEl = byId('time', HTMLElement);
const statusEl = byId('status', HTMLElement);
const sweepCtx = context(byId('sweep', HTMLCanvasElement));
const stripCtx = context(byId('strip', HTMLCanvasElement));
const qrCtx = context(byId('qr', HTMLCanvasElement));

const controls = setupControls();
const clock = createClock();
const stats = createFrameStats();

let lastSlot = Number.NaN;
let coarseDirty = true;
let lastStatusAt = Number.NEGATIVE_INFINITY;

// Match canvas backing stores to device pixels so cell and module edges stay sharp.
const resizer = new ResizeObserver(() => {
  for (const ctx of [sweepCtx, stripCtx, qrCtx]) {
    const rect = ctx.canvas.getBoundingClientRect();
    const width = Math.round(rect.width * devicePixelRatio);
    const height = Math.round(rect.height * devicePixelRatio);
    if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
      ctx.canvas.width = width;
      ctx.canvas.height = height;
      coarseDirty = true;
    }
  }
});
for (const ctx of [sweepCtx, stripCtx, qrCtx]) resizer.observe(ctx.canvas);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    clock.reanchor();
    stats.reset();
  }
});

// One snapshot per frame feeds every element, so nothing on screen disagrees.
function frame(timestamp: number): void {
  stats.push(timestamp);
  const snap = toSnapshot(clock.epochAt(timestamp));

  if (snap.slot !== lastSlot || coarseDirty) {
    timeEl.textContent = formatTime(snap);
    dateEl.textContent = formatDate(snap);
    tzEl.textContent = `${formatOffset(snap.tzOffsetMin)} ${timeZoneName()}`;
    drawStrip(stripCtx, snap.slotOfDay);
    drawQr(qrCtx, buildQr(buildPayload(snap.slotStartMs, snap.tzOffsetMin)));
    lastSlot = snap.slot;
    coarseDirty = false;
  }

  drawSweep(sweepCtx, snap.phaseMs);

  if (timestamp - lastStatusAt >= STATUS_REFRESH_MS) {
    const parts = [`${stats.hz()} Hz`, `rớt ${stats.dropped()} frame`];
    if (controls.isAwake()) parts.push('● giữ sáng');
    if (controls.canFullscreen && !controls.isFullscreen()) parts.push('chạm để toàn màn hình');
    statusEl.textContent = parts.join(' · ');
    statusEl.classList.toggle('warn', stats.recentDrop(timestamp));
    lastStatusAt = timestamp;
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
