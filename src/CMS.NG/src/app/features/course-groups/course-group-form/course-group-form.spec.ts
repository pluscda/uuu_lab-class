import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { CourseGroupForm } from './course-group-form';
import { CourseGroup } from '../../../core/models/course-group.model';

const baseUrl = `${environment.apiUrl}/course-groups`;

const cloudGroup: CourseGroup = { pkid: 1, description: '雲端運算' };

function setup(routeId: string | null): {
  fixture: ComponentFixture<CourseGroupForm>;
  component: CourseGroupForm;
  httpMock: HttpTestingController;
  router: Router;
} {
  TestBed.configureTestingModule({
    imports: [CourseGroupForm],
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

  const fixture = TestBed.createComponent(CourseGroupForm);
  return {
    fixture,
    component: fixture.componentInstance,
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router)
  };
}

describe('CourseGroupForm (add mode)', () => {
  it('should start with an empty form in add mode', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();

    expect(component.isEdit()).toBeFalse();
    expect(component.form.controls.description.value).toBe('');
    httpMock.verify();
  });

  it('should not submit when the form is invalid', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();

    component.save();

    httpMock.expectNone(baseUrl);
    expect(component.form.controls.description.touched).toBeTrue();
    httpMock.verify();
  });

  it('should POST a new group and navigate back to the list', () => {
    const { fixture, component, httpMock, router } = setup(null);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    component.form.patchValue({ description: '資訊安全' });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.description).toBe('資訊安全');
    req.flush({ pkid: 7 });

    expect(navigateSpy).toHaveBeenCalledWith(['/course-groups']);
    httpMock.verify();
  });
});

describe('CourseGroupForm (edit mode)', () => {
  it('should load the group and patch the form', () => {
    const { fixture, component, httpMock } = setup('1');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/1`).flush(cloudGroup);

    expect(component.isEdit()).toBeTrue();
    expect(component.form.controls.description.value).toBe('雲端運算');
    expect(component.form.controls.pkid.value).toBe(1);
    httpMock.verify();
  });

  it('should PUT the updated group with the pkid from the loaded record', () => {
    const { fixture, component, httpMock, router } = setup('1');
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/1`).flush(cloudGroup);

    component.form.patchValue({ description: '雲端運算（修改）' });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.pkid).toBe(1);
    expect(req.request.body.description).toBe('雲端運算（修改）');
    req.flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/course-groups']);
    httpMock.verify();
  });
});
