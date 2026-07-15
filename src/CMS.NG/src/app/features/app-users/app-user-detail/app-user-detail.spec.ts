import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { AppUserDetail } from './app-user-detail';
import { AppUser } from '../../../core/models/app-user.model';
import { AUTH_STORAGE_KEY } from '../../../core/services/auth.service';

describe('AppUserDetail', () => {
  const helen: AppUser = {
    pkid: 1,
    userId: 'helen',
    userName: 'Helen Chen',
    isActive: true,
    passwordUpdatedTime: null,
    roleCount: 1,
    roleIds: ['Admin']
  };

  const roles = [{ roleId: 'Admin', roleName: 'Administrator' }];

  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppUserDetail],
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
          useValue: { snapshot: { paramMap: new Map([['id', 'helen']]) } }
        }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  });

  function seedSession(sessionRoles: string[]): void {
    const payload = btoa(JSON.stringify({ sub: 'caller', role: sessionRoles }));
    sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ userId: 'caller', userName: 'Caller', accessToken: `header.${payload}.signature` })
    );
  }

  function renderedResetButton(): HTMLElement | null {
    const fixture = TestBed.createComponent(AppUserDetail);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/app-users/helen`).flush(helen);
    httpMock.expectOne(`${environment.apiUrl}/lookups/app-roles`).flush(roles);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    return buttons.find(b => b.textContent?.includes('重設密碼')) ?? null;
  }

  it('should show the reset-password button only for Admins', () => {
    seedSession(['Admin']);
    expect(renderedResetButton()).not.toBeNull();
  });

  it('should hide the reset-password button for non-Admins', () => {
    seedSession(['User']);
    expect(renderedResetButton()).toBeNull();
  });

  it('should load the user and resolve role labels', () => {
    const fixture = TestBed.createComponent(AppUserDetail);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/app-users/helen`).flush(helen);
    httpMock.expectOne(`${environment.apiUrl}/lookups/app-roles`).flush(roles);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.user()?.userId).toBe('helen');
    expect(component.roleLabel('Admin')).toBe('Administrator (Admin)');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Helen Chen');
    expect(compiled.textContent).toContain('啟用');
  });

  it('reset password (via confirm accept) should POST to reset-password and reload the user', () => {
    const confirmationService = TestBed.inject(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
      options.accept();
      return confirmationService;
    });

    const fixture = TestBed.createComponent(AppUserDetail);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/app-users/helen`).flush(helen);
    httpMock.expectOne(`${environment.apiUrl}/lookups/app-roles`).flush(roles);

    fixture.componentInstance.confirmResetPassword();

    const resetReq = httpMock.expectOne(`${environment.apiUrl}/app-users/helen/reset-password`);
    expect(resetReq.request.method).toBe('POST');
    resetReq.flush(null);

    const reload = httpMock.expectOne(`${environment.apiUrl}/app-users/helen`);
    reload.flush({ ...helen, passwordUpdatedTime: '2026-07-14T06:00:00' });

    expect(fixture.componentInstance.user()?.passwordUpdatedTime).toBe('2026-07-14T06:00:00');
  });
});
