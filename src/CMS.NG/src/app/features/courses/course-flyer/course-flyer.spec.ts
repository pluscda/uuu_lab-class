import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { environment } from '../../../../environments/environment';
import { CourseFlyer } from './course-flyer';
import { Course } from '../../../core/models/course.model';
import { QrCodeService } from '../../../core/services/qr-code.service';

describe('CourseFlyer', () => {
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
    objective: '培養學員具備 Azure 基礎管理能力。',
    target: '具備基礎網路概念之 IT 人員。',
    prerequisites: null,
    outline: '模組一：帳戶管理。模組二：儲存體管理。',
    towardCertOrExam: null,
    note: null,
    otherInfo: null,
    canRepeat: true,
    partnerName: 'Microsoft',
    courseGroupDescription: '雲端運算',
    publishStatusDescription: '已發布',
    certificationPkids: [],
    jobCategoryPkids: []
  };

  const emptyFieldsCourse: Course = { ...azureCourse, objective: null, target: null, outline: null };

  let httpMock: HttpTestingController;
  let qrCodeService: jasmine.SpyObj<QrCodeService>;
  let router: Router;

  beforeEach(async () => {
    qrCodeService = jasmine.createSpyObj<QrCodeService>('QrCodeService', ['toDataUrl']);
    qrCodeService.toDataUrl.and.resolveTo(fakeQrDataUrl);

    await TestBed.configureTestingModule({
      imports: [CourseFlyer],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        providePrimeNG(),
        { provide: QrCodeService, useValue: qrCodeService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['id', '1']]) } }
        }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    document.body.classList.remove('course-flyer-active');
  });

  function createAndLoad(course: Course = azureCourse): ComponentFixture<CourseFlyer> {
    const fixture = TestBed.createComponent(CourseFlyer);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/courses/1`).flush(course);
    fixture.detectChanges();
    return fixture;
  }

  it('should render the curated customer-facing fields', async () => {
    const fixture = createAndLoad();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Azure 基礎課程');
    expect(compiled.textContent).toContain('Microsoft');
    expect(compiled.textContent).toContain('8 小時');
    expect(compiled.textContent).toContain('NT$ 12,000');
    expect(compiled.textContent).toContain('1.5 點');
    expect(compiled.textContent).toContain('培養學員具備 Azure 基礎管理能力。');
  });

  it('should request the QR code at flyer print width and render the image', async () => {
    const fixture = createAndLoad();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(qrCodeService.toDataUrl).toHaveBeenCalledOnceWith(
      'https://www.uuu.com.tw/Course/Show/1/AZ-900',
      300
    );

    const compiled = fixture.nativeElement as HTMLElement;
    const image = compiled.querySelector<HTMLImageElement>('.flyer-qr');
    expect(image?.src).toBe(fakeQrDataUrl);
  });

  it('should hide optional sections when their fields are empty', async () => {
    const fixture = createAndLoad(emptyFieldsCourse);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.flyer-section').length).toBe(0);
  });

  it('should set and restore document.title and the print body class on destroy', async () => {
    const originalTitle = document.title;
    const fixture = createAndLoad();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.title).toBe('AZ-900 課程傳單');
    expect(document.body.classList.contains('course-flyer-active')).toBeTrue();

    fixture.destroy();

    expect(document.title).toBe(originalTitle);
    expect(document.body.classList.contains('course-flyer-active')).toBeFalse();
  });

  it('should show 查無資料 when the course fails to load', () => {
    const fixture = TestBed.createComponent(CourseFlyer);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/courses/1`).error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('查無資料');
  });

  it('should navigate back to the course detail page', async () => {
    const fixture = createAndLoad();
    await fixture.whenStable();
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigate');

    fixture.componentInstance.back();

    expect(navigateSpy).toHaveBeenCalledWith(['/courses', 1]);
  });
});
