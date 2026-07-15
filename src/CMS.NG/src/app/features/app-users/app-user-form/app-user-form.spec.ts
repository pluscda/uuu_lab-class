import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { AppUserForm } from './app-user-form';
import { AppUser } from '../../../core/models/app-user.model';
import { AUTH_STORAGE_KEY } from '../../../core/services/auth.service';

const baseUrl = `${environment.apiUrl}/app-users`;
const rolesUrl = `${environment.apiUrl}/lookups/app-roles`;

// In edit mode the toolbar RowAuditBadge fetches the record's audit trail;
// flush it (when present) so verify() only guards the form's own requests.
function flushAuditAndVerify(httpMock: HttpTestingController): void {
  httpMock.match(req => req.url === `${environment.apiUrl}/rowaudit`).forEach(req => req.flush([]));
  httpMock.verify();
}

const roles = [
  { roleId: 'Admin', roleName: 'Administrator' },
  { roleId: 'User', roleName: 'General User' }
];

const helen: AppUser = {
  pkid: 1,
  userId: 'helen',
  userName: 'Helen Chen',
  isActive: true,
  passwordUpdatedTime: null,
  roleCount: 1,
  roleIds: ['Admin']
};

// AuthService decodes roles from the stored token, so admin/non-admin is
// simulated by seeding sessionStorage before the component (and the service)
// is created — same pattern as app.spec.ts.
function seedSession(sessionRoles: string[]): void {
  const payload = btoa(JSON.stringify({ sub: 'caller', role: sessionRoles }));
  sessionStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      userId: 'caller',
      userName: 'Caller',
      accessToken: `header.${payload}.signature`
    })
  );
}

function setup(routeId: string | null): {
  fixture: ComponentFixture<AppUserForm>;
  component: AppUserForm;
  httpMock: HttpTestingController;
  router: Router;
} {
  TestBed.configureTestingModule({
    imports: [AppUserForm],
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

  const fixture = TestBed.createComponent(AppUserForm);
  return {
    fixture,
    component: fixture.componentInstance,
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router)
  };
}

describe('AppUserForm (add mode)', () => {
  it('should default isActive to true, keep userId enabled, and have no password control', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();
    httpMock.expectOne(rolesUrl).flush(roles);

    expect(component.isEdit()).toBeFalse();
    expect(component.form.controls.userId.enabled).toBeTrue();
    expect(component.form.controls.isActive.value).toBeTrue();
    expect('password' in component.form.controls).toBeFalse();
    expect('passwordHash' in component.form.controls).toBeFalse();
    flushAuditAndVerify(httpMock);
  });

  it('should not submit when the form is invalid', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();
    httpMock.expectOne(rolesUrl).flush(roles);

    component.save();

    httpMock.expectNone(baseUrl);
    expect(component.form.controls.userId.touched).toBeTrue();
    expect(component.form.controls.userName.touched).toBeTrue();
    flushAuditAndVerify(httpMock);
  });

  it('should POST a new user without any password field and navigate back to the list', () => {
    const { fixture, component, httpMock, router } = setup(null);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    httpMock.expectOne(rolesUrl).flush(roles);

    component.form.patchValue({
      userId: 'newuser',
      userName: '新使用者',
      roleIds: ['User']
    });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.userId).toBe('newuser');
    expect(req.request.body.roleIds).toEqual(['User']);
    expect('passwordHash' in req.request.body).toBeFalse();
    req.flush({ pkid: 3 });

    expect(navigateSpy).toHaveBeenCalledWith(['/app-users']);
    flushAuditAndVerify(httpMock);
  });
});

describe('AppUserForm (edit mode)', () => {
  it('should load the user, patch the form, and disable userId', () => {
    const { fixture, component, httpMock } = setup('helen');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/helen`).flush(helen);
    httpMock.expectOne(rolesUrl).flush(roles);

    expect(component.isEdit()).toBeTrue();
    expect(component.form.controls.userId.disabled).toBeTrue();
    expect(component.form.controls.userName.value).toBe('Helen Chen');
    expect(component.form.getRawValue().roleIds).toEqual(['Admin']);
    flushAuditAndVerify(httpMock);
  });

  it('should PUT the updated user including the disabled userId', () => {
    const { fixture, component, httpMock, router } = setup('helen');
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/helen`).flush(helen);
    httpMock.expectOne(rolesUrl).flush(roles);

    component.form.patchValue({ userName: 'Helen C.', isActive: false });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.userId).toBe('helen');
    expect(req.request.body.userName).toBe('Helen C.');
    expect(req.request.body.isActive).toBeFalse();
    req.flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/app-users']);
    flushAuditAndVerify(httpMock);
  });
});

describe('AppUserForm (reset password to default)', () => {
  afterEach(() => sessionStorage.removeItem(AUTH_STORAGE_KEY));

  function setupEdit(sessionRoles: string[], routeId: string | null = 'helen') {
    seedSession(sessionRoles);
    const ctx = setup(routeId);
    ctx.fixture.detectChanges();
    if (routeId) {
      ctx.httpMock.expectOne(`${baseUrl}/${routeId}`).flush(helen);
    }
    ctx.httpMock.expectOne(rolesUrl).flush(roles);
    ctx.fixture.detectChanges();
    return ctx;
  }

  function resetButton(fixture: ComponentFixture<AppUserForm>): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.reset-password-button');
  }

  it('should show the reset button in edit mode when the signed-in user is an Admin', () => {
    const { fixture, httpMock } = setupEdit(['Admin']);

    expect(resetButton(fixture)).not.toBeNull();
    flushAuditAndVerify(httpMock);
  });

  it('should hide the reset button when the signed-in user is not an Admin', () => {
    const { fixture, httpMock } = setupEdit(['User']);

    expect(resetButton(fixture)).toBeNull();
    flushAuditAndVerify(httpMock);
  });

  it('should hide the reset button in add mode even for an Admin', () => {
    const { fixture, httpMock } = setupEdit(['Admin'], null);

    expect(resetButton(fixture)).toBeNull();
    flushAuditAndVerify(httpMock);
  });

  it('should POST only the UserId to reset-password after the confirm is accepted', () => {
    const { fixture, httpMock } = setupEdit(['Admin']);
    const confirmationService = TestBed.inject(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
      options.accept();
      return confirmationService;
    });

    resetButton(fixture)!.click();

    const req = httpMock.expectOne(`${baseUrl}/helen/reset-password`);
    expect(req.request.method).toBe('POST');
    // Only the UserId (in the URL) — no password or hash is ever sent
    expect(req.request.body).toBeNull();
    req.flush(null);
    flushAuditAndVerify(httpMock);
  });
});
