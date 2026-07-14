import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { CourseList } from './course-list';
import { Course } from '../../../core/models/course.model';

describe('CourseList', () => {
  let fixture: ComponentFixture<CourseList>;
  let component: CourseList;
  let httpMock: HttpTestingController;
  let router: Router;
  const queryUrl = `${environment.apiUrl}/courses/query`;

  const courses: Course[] = [
    {
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
      certificationPkids: [],
      jobCategoryPkids: []
    },
    {
      pkid: 2,
      title: 'CCNA 網路課程',
      officialTitle: null,
      courseId: 'CCNA',
      prodCourseId: 'PCCNA',
      friendlyUrl: 'ccna',
      displayOrder: 2,
      partnerPkid: 2,
      courseGroupPkid: null,
      publishStatusPkid: 1,
      scheduleOn: '2026-02-01',
      scheduleOff: '2036-02-01',
      hour: 40,
      listPrice: 45000,
      learningCredit: 5,
      material: null,
      objective: null,
      target: null,
      prerequisites: null,
      outline: null,
      towardCertOrExam: null,
      note: null,
      otherInfo: null,
      canRepeat: false,
      partnerName: 'Cisco',
      courseGroupDescription: null,
      publishStatusDescription: '草稿',
      certificationPkids: [],
      jobCategoryPkids: []
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CourseList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        providePrimeNG(),
        ConfirmationService,
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseList);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  function flushLookups(): void {
    httpMock.expectOne(`${environment.apiUrl}/lookups/partners`).flush([{ pkid: 1, name: 'Microsoft' }]);
    httpMock.expectOne(`${environment.apiUrl}/lookups/course-groups`).flush([{ pkid: 2, description: '雲端運算' }]);
    httpMock
      .expectOne(`${environment.apiUrl}/lookups/publish-statuses`)
      .flush([{ pkid: 2, description: '已發布' }]);
  }

  function flushInitial(): void {
    fixture.detectChanges(); // triggers ngOnInit
    flushLookups();
    const req = httpMock.expectOne(queryUrl);
    expect(req.request.method).toBe('POST');
    req.flush(courses);
    fixture.detectChanges();
  }

  it('should load lookups then courses on init', () => {
    flushInitial();
    expect(component.partnerOptions().length).toBe(1);
    expect(component.courses().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('should render JOIN-resolved FK labels in the table', () => {
    flushInitial();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Microsoft');
    expect(rows[0].textContent).toContain('已發布');
    expect(rows[1].textContent).toContain('—'); // null courseGroupDescription
  });

  it('applyFilters should convert date filters to ISO strings and persist', () => {
    flushInitial();

    component.filters.partnerPkid = 1;
    component.scheduleOnFrom = new Date(2026, 0, 1); // 2026-01-01 local
    component.applyFilters();

    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.partnerPkid).toBe(1);
    expect(req.request.body.scheduleOnFrom).toBe('2026-01-01');
    req.flush([courses[0]]);

    const saved = JSON.parse(sessionStorage.getItem('course-list-filters')!);
    expect(saved.scheduleOnFrom).toBe('2026-01-01');
    expect(component.courses().length).toBe(1);
  });

  it('should restore filters (including dates) from session storage on init', () => {
    sessionStorage.setItem(
      'course-list-filters',
      JSON.stringify({ keyword: 'azure', scheduleOnFrom: '2026-01-01' })
    );

    fixture.detectChanges();
    flushLookups();
    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('azure');
    req.flush([courses[0]]);

    expect(component.filters.keyword).toBe('azure');
    expect(component.scheduleOnFrom).toEqual(new Date(2026, 0, 1));
  });

  it('view/edit/add should navigate to the expected routes', () => {
    const navigateSpy = spyOn(router, 'navigate');
    flushInitial();

    component.view(courses[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/courses', 1]);

    component.edit(courses[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/courses', 1, 'edit']);

    component.add();
    expect(navigateSpy).toHaveBeenCalledWith(['/courses/new']);
  });

  it('delete (via confirm accept) should call DELETE and reload', () => {
    const confirmationService = TestBed.inject(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
      options.accept();
      return confirmationService;
    });
    flushInitial();

    component.confirmDelete(courses[0]);

    const deleteReq = httpMock.expectOne(`${environment.apiUrl}/courses/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const reload = httpMock.expectOne(queryUrl);
    reload.flush([courses[1]]);
    expect(component.courses().length).toBe(1);
  });
});
