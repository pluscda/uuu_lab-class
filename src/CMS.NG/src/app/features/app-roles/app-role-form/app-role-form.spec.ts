import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { AppRoleForm } from './app-role-form';
import { AppRole } from '../../../core/models/app-role.model';

const baseUrl = `${environment.apiUrl}/app-roles`;
const usersUrl = `${environment.apiUrl}/lookups/app-users`;

const users = [
  { userId: 'helen', userName: 'helen', isActive: true },
  { userId: 'miles@uuu.com.tw', userName: 'Miles Sun', isActive: true }
];

const adminRole: AppRole = {
  pkid: 1,
  roleId: 'Admin',
  roleName: 'Administrator',
  permissionLevel: 1,
  description: '系統管理員',
  userCount: 1,
  userIds: ['helen']
};

function setup(routeId: string | null): {
  fixture: ComponentFixture<AppRoleForm>;
  component: AppRoleForm;
  httpMock: HttpTestingController;
  router: Router;
} {
  TestBed.configureTestingModule({
    imports: [AppRoleForm],
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

  const fixture = TestBed.createComponent(AppRoleForm);
  return {
    fixture,
    component: fixture.componentInstance,
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router)
  };
}

describe('AppRoleForm (add mode)', () => {
  it('should default permissionLevel to 100 and keep roleId enabled', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();
    httpMock.expectOne(usersUrl).flush(users);

    expect(component.isEdit()).toBeFalse();
    expect(component.form.controls.roleId.enabled).toBeTrue();
    expect(component.form.controls.permissionLevel.value).toBe(100);
    httpMock.verify();
  });

  it('should not submit when the form is invalid', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();
    httpMock.expectOne(usersUrl).flush(users);

    component.save();

    httpMock.expectNone(baseUrl);
    expect(component.form.controls.roleId.touched).toBeTrue();
    httpMock.verify();
  });

  it('should POST a new role and navigate back to the list', () => {
    const { fixture, component, httpMock, router } = setup(null);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    httpMock.expectOne(usersUrl).flush(users);

    component.form.patchValue({
      roleId: 'Editor',
      roleName: '編輯者',
      permissionLevel: 50,
      userIds: ['helen']
    });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.roleId).toBe('Editor');
    expect(req.request.body.userIds).toEqual(['helen']);
    req.flush({ pkid: 3 });

    expect(navigateSpy).toHaveBeenCalledWith(['/app-roles']);
    httpMock.verify();
  });
});

describe('AppRoleForm (edit mode)', () => {
  it('should load the role, patch the form, and disable roleId', () => {
    const { fixture, component, httpMock } = setup('Admin');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/Admin`).flush(adminRole);
    httpMock.expectOne(usersUrl).flush(users);

    expect(component.isEdit()).toBeTrue();
    expect(component.form.controls.roleId.disabled).toBeTrue();
    expect(component.form.controls.roleName.value).toBe('Administrator');
    expect(component.form.getRawValue().userIds).toEqual(['helen']);
    httpMock.verify();
  });

  it('should PUT the updated role including the disabled roleId', () => {
    const { fixture, component, httpMock, router } = setup('Admin');
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/Admin`).flush(adminRole);
    httpMock.expectOne(usersUrl).flush(users);

    component.form.patchValue({ roleName: 'Super Admin' });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.roleId).toBe('Admin');
    expect(req.request.body.roleName).toBe('Super Admin');
    req.flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/app-roles']);
    httpMock.verify();
  });
});
