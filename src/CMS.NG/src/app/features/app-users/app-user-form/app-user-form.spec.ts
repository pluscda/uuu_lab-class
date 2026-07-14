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

const baseUrl = `${environment.apiUrl}/app-users`;
const rolesUrl = `${environment.apiUrl}/lookups/app-roles`;

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
    httpMock.verify();
  });

  it('should not submit when the form is invalid', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();
    httpMock.expectOne(rolesUrl).flush(roles);

    component.save();

    httpMock.expectNone(baseUrl);
    expect(component.form.controls.userId.touched).toBeTrue();
    expect(component.form.controls.userName.touched).toBeTrue();
    httpMock.verify();
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
    httpMock.verify();
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
    httpMock.verify();
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
    httpMock.verify();
  });
});
