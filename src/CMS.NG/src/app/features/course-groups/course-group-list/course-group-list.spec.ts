import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { CourseGroupList } from './course-group-list';
import { CourseGroup } from '../../../core/models/course-group.model';

describe('CourseGroupList', () => {
  let fixture: ComponentFixture<CourseGroupList>;
  let component: CourseGroupList;
  let httpMock: HttpTestingController;
  let router: Router;
  const queryUrl = `${environment.apiUrl}/course-groups/query`;

  const groups: CourseGroup[] = [
    { pkid: 1, description: '雲端運算' },
    { pkid: 2, description: '資訊安全' }
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CourseGroupList],
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

    fixture = TestBed.createComponent(CourseGroupList);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  function flushInitialQuery(): void {
    fixture.detectChanges(); // triggers ngOnInit
    const req = httpMock.expectOne(queryUrl);
    expect(req.request.method).toBe('POST');
    req.flush(groups);
    fixture.detectChanges();
  }

  it('should load groups on init via query endpoint', () => {
    flushInitialQuery();
    expect(component.groups().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('should render group rows in the table', () => {
    flushInitialQuery();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('雲端運算');
    expect(rows[1].textContent).toContain('資訊安全');
  });

  it('applyFilters should persist filters to session storage and re-query', () => {
    flushInitialQuery();

    component.filters.keyword = '雲端';
    component.applyFilters();

    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('雲端');
    req.flush([groups[0]]);

    const saved = JSON.parse(sessionStorage.getItem('course-group-list-filters')!);
    expect(saved.keyword).toBe('雲端');
    expect(component.groups().length).toBe(1);
  });

  it('should restore filters from session storage on init', () => {
    sessionStorage.setItem('course-group-list-filters', JSON.stringify({ keyword: '安全' }));

    fixture.detectChanges();
    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('安全');
    req.flush([groups[1]]);

    expect(component.filters.keyword).toBe('安全');
  });

  it('view/edit/add should navigate to the expected routes', () => {
    const navigateSpy = spyOn(router, 'navigate');
    flushInitialQuery();

    component.view(groups[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/course-groups', 1]);

    component.edit(groups[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/course-groups', 1, 'edit']);

    component.add();
    expect(navigateSpy).toHaveBeenCalledWith(['/course-groups/new']);
  });

  it('delete (via confirm accept) should call DELETE and reload', () => {
    const confirmationService = TestBed.inject(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
      options.accept();
      return confirmationService;
    });
    flushInitialQuery();

    component.confirmDelete(groups[0]);

    const deleteReq = httpMock.expectOne(`${environment.apiUrl}/course-groups/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const reload = httpMock.expectOne(queryUrl);
    reload.flush([groups[1]]);
    expect(component.groups().length).toBe(1);
  });
});
