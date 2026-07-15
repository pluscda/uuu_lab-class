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

  describe('inline cell editing', () => {
    function cell(rowIndex: number, field: string): HTMLElement {
      const row = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')[rowIndex];
      return row.querySelector(`td[data-field="${field}"]`) as HTMLElement;
    }

    function dblclick(el: HTMLElement): void {
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();
    }

    function blur(el: HTMLElement): void {
      el.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
    }

    it('double-click enters edit mode; single click does not', () => {
      flushInitial();
      const titleCell = cell(0, 'title');

      titleCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(titleCell.querySelector('input')).toBeNull();
      expect(component.editingField()).toBeNull();

      dblclick(titleCell);
      const input = titleCell.querySelector('input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(component.editingField()).toBe('title');
      expect(component.editingPkid()).toBe(1);
      expect(component.editValue).toBe('Azure 基礎課程');
    });

    it('read-only columns (主代碼/原廠/課程群組) cannot be edited', () => {
      flushInitial();
      const row = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')[0];
      // Column order: 0 = pkid, 5 = partnerName, 6 = courseGroupDescription
      for (const index of [0, 5, 6]) {
        const td = row.children[index] as HTMLElement;
        td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        fixture.detectChanges();
        expect(td.querySelector('input, p-select, p-datepicker, p-checkbox')).toBeNull();
        expect(component.editingField()).toBeNull();
      }
    });

    it('blur persists the edit via GET-by-id then PUT, preserving N-N ids', () => {
      flushInitial();
      const titleCell = cell(0, 'title');
      dblclick(titleCell);

      component.editValue = '新課程名稱';
      blur(titleCell.querySelector('input')!);

      const getReq = httpMock.expectOne(`${environment.apiUrl}/courses/1`);
      expect(getReq.request.method).toBe('GET');
      getReq.flush({ ...courses[0], certificationPkids: [9], jobCategoryPkids: [4] });

      const putReq = httpMock.expectOne(`${environment.apiUrl}/courses`);
      expect(putReq.request.method).toBe('PUT');
      expect(putReq.request.body.title).toBe('新課程名稱');
      expect(putReq.request.body.certificationPkids).toEqual([9]);
      expect(putReq.request.body.jobCategoryPkids).toEqual([4]);
      putReq.flush(null);
      fixture.detectChanges();

      expect(component.courses()[0].title).toBe('新課程名稱');
      expect(component.editingField()).toBeNull();
      expect(cell(0, 'title').textContent).toContain('新課程名稱');
    });

    it('required field cleared: shows inline error, stays in edit mode, no HTTP call', () => {
      flushInitial();
      const titleCell = cell(0, 'title');
      dblclick(titleCell);

      component.editValue = '   ';
      blur(titleCell.querySelector('input')!);

      expect(component.editError()).toBe('此欄位為必填');
      expect(component.editingField()).toBe('title');
      expect(cell(0, 'title').querySelector('.edit-error')).toBeTruthy();
      expect(cell(0, 'title').querySelector('input')).toBeTruthy();
      // httpMock.verify() in afterEach asserts no update request was made
    });

    it('negative number: shows inline error and blocks the save', () => {
      flushInitial();
      const hourCell = cell(0, 'hour');
      dblclick(hourCell);

      component.editValue = -5;
      blur(hourCell.querySelector('input')!);

      expect(component.editError()).toBe('必須為非負數字');
      expect(component.editingField()).toBe('hour');
    });

    it('invalid date: shows inline error and blocks the save', () => {
      flushInitial();
      component.startEdit(courses[0], 'scheduleOn');
      component.editValue = null;
      component.commitEdit(courses[0]);

      expect(component.editError()).toBe('請輸入有效日期');
      expect(component.editingField()).toBe('scheduleOn');
    });

    it('上架日期 after 下架日期: shows inline error and blocks the save', () => {
      flushInitial();

      component.startEdit(courses[0], 'scheduleOn');
      component.editValue = new Date(2037, 0, 1); // scheduleOff is 2036-01-01
      component.commitEdit(courses[0]);
      expect(component.editError()).toBe('上架日期不可晚於下架日期');

      component.startEdit(courses[0], 'scheduleOff');
      component.editValue = new Date(2025, 0, 1); // scheduleOn is 2026-01-01
      component.commitEdit(courses[0]);
      expect(component.editError()).toBe('上架日期不可晚於下架日期');
    });

    it('failed save reverts the cell to its previous value and exits edit mode', () => {
      flushInitial();
      const titleCell = cell(0, 'title');
      dblclick(titleCell);

      component.editValue = '不會儲存的名稱';
      blur(titleCell.querySelector('input')!);

      httpMock.expectOne(`${environment.apiUrl}/courses/1`).flush(courses[0]);
      httpMock
        .expectOne(`${environment.apiUrl}/courses`)
        .flush('error', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(component.courses()[0].title).toBe('Azure 基礎課程');
      expect(component.editingField()).toBeNull();
      expect(cell(0, 'title').textContent).toContain('Azure 基礎課程');
      expect(cell(0, 'title').querySelector('input')).toBeNull();
    });
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
