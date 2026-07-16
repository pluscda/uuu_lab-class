import { Injectable } from '@angular/core';
import QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrCodeService {
  toDataUrl(text: string, width = 160): Promise<string> {
    return QRCode.toDataURL(text, { width, margin: 1 });
  }
}
