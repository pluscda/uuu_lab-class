import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { CourseDetail } from './course-detail';
import { Course } from '../../../core/models/course.model';

describe('CourseDetail', () => {
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

  beforeEach(async () => {
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
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['id', '1']]) } }
        }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should load the course and resolve relation labels', () => {
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
});
