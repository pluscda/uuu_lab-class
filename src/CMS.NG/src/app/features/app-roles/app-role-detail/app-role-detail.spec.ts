import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { AppRoleDetail } from './app-role-detail';
import { AppRole } from '../../../core/models/app-role.model';

describe('AppRoleDetail', () => {
  const adminRole: AppRole = {
    pkid: 1,
    roleId: 'Admin',
    roleName: 'Administrator',
    permissionLevel: 1,
    description: '系統管理員',
    userCount: 1,
    userIds: ['helen']
  };

  const users = [{ userId: 'helen', userName: 'Helen Chen', isActive: true }];

  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppRoleDetail],
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
          useValue: { snapshot: { paramMap: new Map([['id', 'Admin']]) } }
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

  it('should load the role and resolve user labels', () => {
    const fixture = TestBed.createComponent(AppRoleDetail);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/app-roles/Admin`).flush(adminRole);
    httpMock.expectOne(`${environment.apiUrl}/lookups/app-users`).flush(users);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.role()?.roleId).toBe('Admin');
    expect(component.userLabel('helen')).toBe('Helen Chen (helen)');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Administrator');
    expect(compiled.textContent).toContain('系統管理員');
  });
});
