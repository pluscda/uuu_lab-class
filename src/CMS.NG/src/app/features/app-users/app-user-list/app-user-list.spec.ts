import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { AppUserList } from './app-user-list';
import { AppUser } from '../../../core/models/app-user.model';

describe('AppUserList', () => {
  let fixture: ComponentFixture<AppUserList>;
  let component: AppUserList;
  let httpMock: HttpTestingController;
  let router: Router;
  const queryUrl = `${environment.apiUrl}/app-users/query`;

  const users: AppUser[] = [
    {
      pkid: 1,
      userId: 'helen',
      userName: 'Helen Chen',
      isActive: true,
      passwordUpdatedTime: null,
      roleCount: 2,
      roleIds: []
    },
    {
      pkid: 2,
      userId: 'miles@uuu.com.tw',
      userName: 'Miles Sun',
      isActive: false,
      passwordUpdatedTime: '2026-07-01T02:30:00',
      roleCount: 0,
      roleIds: []
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppUserList],
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

    fixture = TestBed.createComponent(AppUserList);
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
    req.flush(users);
    fixture.detectChanges();
  }

  it('should load users on init via query endpoint', () => {
    flushInitialQuery();
    expect(component.users().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('should render user rows with active tags', () => {
    flushInitialQuery();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('helen');
    expect(rows[0].textContent).toContain('啟用');
    expect(rows[1].textContent).toContain('停用');
  });

  it('applyFilters should persist filters to session storage and re-query', () => {
    flushInitialQuery();

    component.filters.keyword = 'helen';
    component.filters.isActive = true;
    component.applyFilters();

    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('helen');
    expect(req.request.body.isActive).toBeTrue();
    req.flush([users[0]]);

    const saved = JSON.parse(sessionStorage.getItem('app-user-list-filters')!);
    expect(saved.keyword).toBe('helen');
    expect(component.users().length).toBe(1);
  });

  it('should restore filters from session storage on init', () => {
    sessionStorage.setItem('app-user-list-filters', JSON.stringify({ keyword: 'miles' }));

    fixture.detectChanges();
    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('miles');
    req.flush([users[1]]);

    expect(component.filters.keyword).toBe('miles');
  });

  it('view/edit/add should navigate to the expected routes', () => {
    const navigateSpy = spyOn(router, 'navigate');
    flushInitialQuery();

    component.view(users[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/app-users', 'helen']);

    component.edit(users[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/app-users', 'helen', 'edit']);

    component.add();
    expect(navigateSpy).toHaveBeenCalledWith(['/app-users/new']);
  });

  it('delete (via confirm accept) should call DELETE with encoded id and reload', () => {
    const confirmationService = TestBed.inject(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
      options.accept();
      return confirmationService;
    });
    flushInitialQuery();

    component.confirmDelete(users[1]);

    const deleteReq = httpMock.expectOne(`${environment.apiUrl}/app-users/miles%40uuu.com.tw`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const reload = httpMock.expectOne(queryUrl);
    reload.flush([users[0]]);
    expect(component.users().length).toBe(1);
  });
});
