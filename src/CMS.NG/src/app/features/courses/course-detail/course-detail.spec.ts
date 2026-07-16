import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { CourseDetail } from './course-detail';
import { Course } from '../../../core/models/course.model';
import { QrCodeService } from '../../../core/services/qr-code.service';

describe('CourseDetail', () => {
  const fakeQrDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const azureCourse: Course = {
    pkid: 1,
    title: 'Azure 基礎課程',
    officialTitle: null,
    courseId: 'AZ-900',
    prodCourseId: 'PAZ900',
    friendlyUrl: 'az-900',
    displayOrder: 1,
    partnerPkid: 1,
    courseGroupPkid: 2,
    publishStatusPkid: 2,
    scheduleOn: '2026-01-01',
    scheduleOff: '2036-01-01',
    hour: 8,
    listPrice: 12000,
    learningCredit: 1.5,
    material: null,
    objective: null,
    target: null,
    prerequisites: null,
    outline: null,
    towardCertOrExam: null,
    note: null,
    otherInfo: null,
    canRepeat: true,
    partnerName: 'Microsoft',
    courseGroupDescription: '雲端運算',
    publishStatusDescription: '已發布',
    certificationPkids: [10],
    jobCategoryPkids: [1]
  };

  let httpMock: HttpTestingController;
  let qrCodeService: jasmine.SpyObj<QrCodeService>;

  beforeEach(async () => {
    qrCodeService = jasmine.createSpyObj<QrCodeService>('QrCodeService', ['toDataUrl']);
    qrCodeService.toDataUrl.and.resolveTo(fakeQrDataUrl);

    await TestBed.configureTestingModule({
      imports: [CourseDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        providePrimeNG(),
        ConfirmationService,
        MessageService,
        { provide: QrCodeService, useValue: qrCodeService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['id', '1']]) } }
        }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // The toolbar RowAuditBadge fetches the record's audit trail once loaded.
    httpMock.match(req => req.url === `${environment.apiUrl}/rowaudit`).forEach(req => req.flush([]));
    httpMock.verify();
  });

  function createAndLoad() {
    const fixture = TestBed.createComponent(CourseDetail);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/courses/1`).flush(azureCourse);
    httpMock
      .expectOne(`${environment.apiUrl}/lookups/certifications`)
      .flush([{ pkid: 10, partnerPkid: 1, title: 'Azure Fundamentals' }]);
    httpMock
      .expectOne(`${environment.apiUrl}/lookups/job-categories`)
      .flush([{ pkid: 1, description: '系統工程師' }]);
    fixture.detectChanges();
    return fixture;
  }

  it('should load the course and resolve relation labels', () => {
    const fixture = createAndLoad();
    const component = fixture.componentInstance;
    expect(component.course()?.courseId).toBe('AZ-900');
    expect(component.certificationLabel(10)).toBe('Azure Fundamentals');
    expect(component.jobCategoryLabel(1)).toBe('系統工程師');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Azure 基礎課程');
    expect(compiled.textContent).toContain('Microsoft');
    expect(compiled.textContent).toContain('雲端運算');
    expect(compiled.textContent).toContain('Azure Fundamentals');
  });

  it('should encode the course show URL built from pkid and courseId into the QR code', () => {
    createAndLoad();

    expect(qrCodeService.toDataUrl).toHaveBeenCalledOnceWith(
      'https://www.uuu.com.tw/Course/Show/1/AZ-900'
    );
  });

  it('should render the QR code image with courseId as its title', async () => {
    const fixture = createAndLoad();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.qr-block .qr-title');
    expect(title?.textContent?.trim()).toBe('AZ-900');

    const image = compiled.querySelector<HTMLImageElement>('.qr-block .qr-image');
    expect(image?.src).toBe(fakeQrDataUrl);
  });

  it('should download the QR code as a PNG image named after the courseId', async () => {
    const fixture = createAndLoad();
    await fixture.whenStable();
    fixture.detectChanges();

    let clickedAnchor: HTMLAnchorElement | undefined;
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      clickedAnchor = this;
    });

    fixture.componentInstance.downloadQrCode();

    expect(clickedAnchor).toBeDefined();
    expect(clickedAnchor!.href).toBe(fakeQrDataUrl);
    expect(clickedAnchor!.download).toBe('AZ-900.png');
    expect(clickedAnchor!.href.startsWith('data:image/png')).toBeTrue();
  });

  it('should navigate to the flyer route on printFlyer', () => {
    const fixture = createAndLoad();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.componentInstance.printFlyer();

    expect(navigateSpy).toHaveBeenCalledWith(['/courses', 1, 'flyer']);
  });
});
