import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { CourseForm } from './course-form';
import { Course } from '../../../core/models/course.model';

const baseUrl = `${environment.apiUrl}/courses`;
const lookupsUrl = `${environment.apiUrl}/lookups`;

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

function setup(routeId: string | null): {
  fixture: ComponentFixture<CourseForm>;
  component: CourseForm;
  httpMock: HttpTestingController;
  router: Router;
} {
  TestBed.configureTestingModule({
    imports: [CourseForm],
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
        useValue: { snapshot: { paramMap: new Map([['id', routeId]]) } }
      }
    ]
  });

  const fixture = TestBed.createComponent(CourseForm);
  return {
    fixture,
    component: fixture.componentInstance,
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router)
  };
}

function flushLookups(httpMock: HttpTestingController): void {
  httpMock.expectOne(`${lookupsUrl}/partners`).flush([{ pkid: 1, name: 'Microsoft' }]);
  httpMock.expectOne(`${lookupsUrl}/course-groups`).flush([{ pkid: 2, description: '雲端運算' }]);
  httpMock.expectOne(`${lookupsUrl}/publish-statuses`).flush([{ pkid: 2, description: '已發布' }]);
  httpMock
    .expectOne(`${lookupsUrl}/certifications`)
    .flush([{ pkid: 10, partnerPkid: 1, title: 'Azure Fundamentals' }]);
  httpMock.expectOne(`${lookupsUrl}/job-categories`).flush([{ pkid: 1, description: '系統工程師' }]);
}

function expectStickyToolbar(fixture: ComponentFixture<CourseForm>): void {
  const toolbar = (fixture.nativeElement as HTMLElement).querySelector('.page-toolbar') as HTMLElement;
  expect(toolbar).withContext('action toolbar should render').not.toBeNull();
  expect(toolbar.classList.contains('form-toolbar-sticky'))
    .withContext('toolbar should carry the sticky modifier class')
    .toBeTrue();
  expect(getComputedStyle(toolbar).position).toBe('sticky');

  const labels = Array.from(toolbar.querySelectorAll('.toolbar-actions button')).map(
    button => button.textContent?.trim() ?? ''
  );
  expect(labels).toContain('儲存');
  expect(labels).toContain('取消');
}

describe('CourseForm (add mode)', () => {
  it('should load all lookup options via forkJoin', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();
    flushLookups(httpMock);

    expect(component.isEdit()).toBeFalse();
    expect(component.partnerOptions().length).toBe(1);
    expect(component.certificationOptions()[0].label).toBe('Azure Fundamentals');
    httpMock.verify();
  });

  it('should render a sticky (pinned) action toolbar with Save and Cancel', () => {
    const { fixture, httpMock } = setup(null);
    fixture.detectChanges();
    flushLookups(httpMock);
    fixture.detectChanges();

    expectStickyToolbar(fixture);
    httpMock.verify();
  });

  it('should not submit when the form is invalid', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();
    flushLookups(httpMock);

    component.save();

    httpMock.expectNone(baseUrl);
    expect(component.form.controls.title.touched).toBeTrue();
    expect(component.form.controls.partnerPkid.touched).toBeTrue();
    httpMock.verify();
  });

  it('should auto-default scheduleOff to scheduleOn + 10 years', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();
    flushLookups(httpMock);

    component.form.controls.scheduleOn.setValue(new Date(2026, 6, 15));

    expect(component.form.controls.scheduleOff.value).toEqual(new Date(2036, 6, 15));
    httpMock.verify();
  });

  it('should POST a new course with ISO dates and relation lists', () => {
    const { fixture, component, httpMock, router } = setup(null);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    flushLookups(httpMock);

    component.form.patchValue({
      title: 'Azure 基礎課程',
      courseId: 'AZ-900',
      prodCourseId: 'PAZ900',
      friendlyUrl: 'az-900',
      displayOrder: 1,
      partnerPkid: 1,
      publishStatusPkid: 2,
      scheduleOn: new Date(2026, 0, 1),
      certificationPkids: [10],
      jobCategoryPkids: [1]
    });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.scheduleOn).toBe('2026-01-01');
    expect(req.request.body.scheduleOff).toBe('2036-01-01'); // auto-defaulted
    expect(req.request.body.certificationPkids).toEqual([10]);
    req.flush({ pkid: 7 });

    expect(navigateSpy).toHaveBeenCalledWith(['/courses']);
    httpMock.verify();
  });
});

describe('CourseForm (edit mode)', () => {
  it('should load the course with lookups, patch the form (loaded scheduleOff wins)', () => {
    const { fixture, component, httpMock } = setup('1');
    fixture.detectChanges();

    flushLookups(httpMock);
    httpMock.expectOne(`${baseUrl}/1`).flush(azureCourse);

    expect(component.isEdit()).toBeTrue();
    expect(component.form.controls.title.value).toBe('Azure 基礎課程');
    expect(component.form.controls.scheduleOn.value).toEqual(new Date(2026, 0, 1));
    expect(component.form.controls.scheduleOff.value).toEqual(new Date(2036, 0, 1));
    expect(component.form.controls.certificationPkids.value).toEqual([10]);
    httpMock.verify();
  });

  it('should render a sticky (pinned) action toolbar with Save and Cancel', () => {
    const { fixture, httpMock } = setup('1');
    fixture.detectChanges();

    flushLookups(httpMock);
    httpMock.expectOne(`${baseUrl}/1`).flush(azureCourse);
    fixture.detectChanges();

    expectStickyToolbar(fixture);
    httpMock.verify();
  });

  it('should PUT the updated course with converted dates', () => {
    const { fixture, component, httpMock, router } = setup('1');
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    flushLookups(httpMock);
    httpMock.expectOne(`${baseUrl}/1`).flush(azureCourse);

    component.form.patchValue({ title: 'Azure 基礎課程（改版）' });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.pkid).toBe(1);
    expect(req.request.body.title).toBe('Azure 基礎課程（改版）');
    expect(req.request.body.scheduleOn).toBe('2026-01-01');
    expect(req.request.body.scheduleOff).toBe('2036-01-01');
    req.flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/courses']);
    httpMock.verify();
  });
});
