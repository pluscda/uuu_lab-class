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
});
