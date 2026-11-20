import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';

export function createQrToken() {
  return randomUUID();
}

export function createQrDataUrl(token) {
  return QRCode.toDataURL(token);
}
