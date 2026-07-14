import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { AppRoleList } from './app-role-list';
import { AppRole } from '../../../core/models/app-role.model';

describe('AppRoleList', () => {
  let fixture: ComponentFixture<AppRoleList>;
  let component: AppRoleList;
  let httpMock: HttpTestingController;
  let router: Router;
  const queryUrl = `${environment.apiUrl}/app-roles/query`;

  const roles: AppRole[] = [
    {
      pkid: 1,
      roleId: 'Admin',
      roleName: 'Administrator',
      permissionLevel: 1,
      description: '系統管理員',
      userCount: 3,
      userIds: []
    },
    {
      pkid: 2,
      roleId: 'User',
      roleName: 'User',
      permissionLevel: 100,
      description: '一般使用者',
      userCount: 9,
      userIds: []
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppRoleList],
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

    fixture = TestBed.createComponent(AppRoleList);
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
    req.flush(roles);
    fixture.detectChanges();
  }

  it('should load roles on init via query endpoint', () => {
    flushInitialQuery();
    expect(component.roles().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('should render role rows in the table', () => {
    flushInitialQuery();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Admin');
    expect(rows[1].textContent).toContain('一般使用者');
  });

  it('applyFilters should persist filters to session storage and re-query', () => {
    flushInitialQuery();

    component.filters.keyword = 'admin';
    component.applyFilters();

    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('admin');
    req.flush([roles[0]]);

    const saved = JSON.parse(sessionStorage.getItem('app-role-list-filters')!);
    expect(saved.keyword).toBe('admin');
    expect(component.roles().length).toBe(1);
  });

  it('should restore filters from session storage on init', () => {
    sessionStorage.setItem('app-role-list-filters', JSON.stringify({ keyword: 'user' }));

    fixture.detectChanges();
    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('user');
    req.flush([roles[1]]);

    expect(component.filters.keyword).toBe('user');
  });

  it('view/edit/add should navigate to the expected routes', () => {
    const navigateSpy = spyOn(router, 'navigate');
    flushInitialQuery();

    component.view(roles[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/app-roles', 'Admin']);

    component.edit(roles[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/app-roles', 'Admin', 'edit']);

    component.add();
    expect(navigateSpy).toHaveBeenCalledWith(['/app-roles/new']);
  });

  it('delete (via confirm accept) should call DELETE and reload', () => {
    const confirmationService = TestBed.inject(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
      options.accept();
      return confirmationService;
    });
    flushInitialQuery();

    component.confirmDelete(roles[0]);

    const deleteReq = httpMock.expectOne(`${environment.apiUrl}/app-roles/Admin`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const reload = httpMock.expectOne(queryUrl);
    reload.flush([roles[1]]);
    expect(component.roles().length).toBe(1);
  });
});
