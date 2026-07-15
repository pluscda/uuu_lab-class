import { Injectable } from '@angular/core';
import QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrCodeService {
  toDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, { width: 160, margin: 1 });
  }
}
