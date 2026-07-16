import { TestBed } from '@angular/core/testing';
import { QrCodeService } from './qr-code.service';

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrCodeService);
  });

  it('should generate a PNG data URL for the given text', async () => {
    const dataUrl = await service.toDataUrl('https://www.uuu.com.tw/Course/Show/1/AZ-900');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBeTrue();
  });

  it('should generate a larger image when an explicit width is requested', async () => {
    const text = 'https://www.uuu.com.tw/Course/Show/1/AZ-900';
    const defaultUrl = await service.toDataUrl(text);
    const wideUrl = await service.toDataUrl(text, 300);

    expect(wideUrl.startsWith('data:image/png;base64,')).toBeTrue();
    // A 300px QR PNG encodes to a materially larger base64 payload than the 160px default.
    expect(wideUrl.length).toBeGreaterThan(defaultUrl.length);
  });
});
