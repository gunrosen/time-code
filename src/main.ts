import { createClock, formatDate, formatOffset, formatTime, timeZoneName, toSnapshot } from './clock';
import { HOLD_MS, HOLD_VIBRATE_MS, RESET_CONFIRM_MS, STATUS_REFRESH_MS } from './config';
import { bindConfirmButton } from './confirm';
import { setupControls } from './controls';
import { bindHoldInput, createHoldMachine } from './hold';
import { buildPayload, buildQr, drawQr } from './qr';
import { createFrameStats } from './stats';
import { drawStrip } from './strip';
import { drawSweep } from './sweep';
import { browserStorage, formatTagLabel, loadTag, nextTag, resetTag, saveTag, type Tag } from './tag';

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
const tagEl = byId('tag', HTMLElement);
const tagLabelEl = byId('tag-label', HTMLElement);
const tagProgressEl = byId('tag-progress', HTMLElement);
const resetButton = byId('reset', HTMLButtonElement);
const sweepCtx = context(byId('sweep', HTMLCanvasElement));
const stripCtx = context(byId('strip', HTMLCanvasElement));
const qrCtx = context(byId('qr', HTMLCanvasElement));

const controls = setupControls();
const clock = createClock();
const stats = createFrameStats();

let lastSlot = Number.NaN;
let coarseDirty = true;
let lastStatusAt = Number.NEGATIVE_INFINITY;
let lastProgress = -1;

const storage = browserStorage();
let tag = loadTag(storage);

function renderTag(): void {
  tagEl.dataset.state = tag.state;
  tagLabelEl.textContent = formatTagLabel(tag);
  // Nothing to reset while already IDLE.
  resetButton.hidden = tag.state === 'IDLE';
}

function setTag(next: Tag): void {
  tag = next;
  saveTag(tag, storage);
  renderTag();
  // Redraw the QR on the next frame instead of waiting for the slot to change.
  coarseDirty = true;
  if ('vibrate' in navigator) navigator.vibrate(HOLD_VIBRATE_MS);
}

const hold = createHoldMachine(HOLD_MS);
bindHoldInput(hold);
bindConfirmButton(resetButton, RESET_CONFIRM_MS, (timeStamp) => setTag(resetTag(clock.epochAt(timeStamp))));
renderTag();

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
    drawQr(qrCtx, buildQr(buildPayload(snap.slotStartMs, snap.tzOffsetMin, tag)));
    lastSlot = snap.slot;
    coarseDirty = false;
  }

  drawSweep(sweepCtx, snap.phaseMs);

  const held = hold.update(timestamp);
  if (held) setTag(nextTag(tag, clock.epochAt(held.startedAt)));
  const progress = hold.progress(timestamp);
  if (progress !== lastProgress) {
    tagProgressEl.style.transform = `scaleX(${progress})`;
    lastProgress = progress;
  }

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
