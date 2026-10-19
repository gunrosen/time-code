import QRCode from 'qrcode';
import { QR_PREFIX, QR_QUIET_ZONE, QR_VERSION } from './config';

export type Qr = ReturnType<typeof QRCode.create>;

export function buildPayload(slotStartMs: number, tzOffsetMin: number): string {
  return `${QR_PREFIX};${slotStartMs};${tzOffsetMin}`;
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
