import QRCode from 'qrcode';
import { NO_TASK, QR_PREFIX, QR_QUIET_ZONE, QR_VERSION } from './config';
import type { Tag } from './tag';

export type Qr = ReturnType<typeof QRCode.create>;

// Only QR alphanumeric characters (0-9 A-Z : -), so the payload fits version 3.
export function buildPayload(slotStartMs: number, tzOffsetMin: number, tag: Tag, taskCode: string | null): string {
  return `${QR_PREFIX}:${slotStartMs}:${tzOffsetMin}:${tag.state}:${tag.eventMs}:${taskCode ?? NO_TASK}`;
}

export function buildQr(payload: string): Qr {
  return QRCode.create(payload, { errorCorrectionLevel: 'M', version: QR_VERSION });
}

// Dark modules on a white quiet zone, centred and snapped to whole device pixels.
export function drawQr(ctx: CanvasRenderingContext2D, qr: Qr): void {
  const { width, height } = ctx.canvas;
  const { size } = qr.modules;
  const total = size + QR_QUIET_ZONE * 2;
  const module = Math.floor(Math.min(width, height) / total);
  const side = module * total;
  const x0 = Math.floor((width - side) / 2);
  const y0 = Math.floor((height - side) / 2);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x0, y0, side, side);
  ctx.fillStyle = '#000';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) {
        ctx.fillRect(
          x0 + (col + QR_QUIET_ZONE) * module,
          y0 + (row + QR_QUIET_ZONE) * module,
          module,
          module,
        );
      }
    }
  }
}
