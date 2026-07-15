import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { PublishStatusForm } from './publish-status-form';
import { PublishStatus } from '../../../core/models/publish-status.model';

const baseUrl = `${environment.apiUrl}/publish-statuses`;

// In edit mode the toolbar RowAuditBadge fetches the record's audit trail;
// flush it (when present) so verify() only guards the form's own requests.
function flushAuditAndVerify(httpMock: HttpTestingController): void {
  httpMock.match(req => req.url === `${environment.apiUrl}/rowaudit`).forEach(req => req.flush([]));
  httpMock.verify();
}

const draftStatus: PublishStatus = {
  pkid: 1,
  description: '草稿',
  isDraft: true,
  isPublished: false,
  isDiscontinued: false
};

function setup(routeId: string | null): {
  fixture: ComponentFixture<PublishStatusForm>;
  component: PublishStatusForm;
  httpMock: HttpTestingController;
  router: Router;
} {
  TestBed.configureTestingModule({
    imports: [PublishStatusForm],
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

  const fixture = TestBed.createComponent(PublishStatusForm);
  return {
    fixture,
    component: fixture.componentInstance,
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router)
  };
}

describe('PublishStatusForm (add mode)', () => {
  it('should keep pkid enabled and default flags to false', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();

    expect(component.isEdit()).toBeFalse();
    expect(component.form.controls.pkid.enabled).toBeTrue();
    expect(component.form.controls.isDraft.value).toBeFalse();
    expect(component.form.controls.isPublished.value).toBeFalse();
    expect(component.form.controls.isDiscontinued.value).toBeFalse();
    flushAuditAndVerify(httpMock);
  });

  it('should not submit when the form is invalid', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();

    component.save();

    httpMock.expectNone(baseUrl);
    expect(component.form.controls.pkid.touched).toBeTrue();
    expect(component.form.controls.description.touched).toBeTrue();
    flushAuditAndVerify(httpMock);
  });

  it('should POST a new status and navigate back to the list', () => {
    const { fixture, component, httpMock, router } = setup(null);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    component.form.patchValue({
      pkid: 3,
      description: '已下架',
      isDiscontinued: true
    });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.pkid).toBe(3);
    expect(req.request.body.isDiscontinued).toBeTrue();
    req.flush({ pkid: 3 });

    expect(navigateSpy).toHaveBeenCalledWith(['/publish-statuses']);
    flushAuditAndVerify(httpMock);
  });

  it('should show 主代碼已存在 on 409 conflict', () => {
    const { fixture, component, httpMock } = setup(null);
    const messageService = TestBed.inject(MessageService);
    const addSpy = spyOn(messageService, 'add');
    fixture.detectChanges();

    component.form.patchValue({ pkid: 1, description: '草稿' });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    req.flush({ message: 'exists' }, { status: 409, statusText: 'Conflict' });

    expect(addSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'error', detail: '主代碼已存在' })
    );
    expect(component.saving()).toBeFalse();
    flushAuditAndVerify(httpMock);
  });
});

describe('PublishStatusForm (edit mode)', () => {
  it('should load the status, patch the form, and disable pkid', () => {
    const { fixture, component, httpMock } = setup('1');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/1`).flush(draftStatus);

    expect(component.isEdit()).toBeTrue();
    expect(component.form.controls.pkid.disabled).toBeTrue();
    expect(component.form.controls.description.value).toBe('草稿');
    expect(component.form.controls.isDraft.value).toBeTrue();
    flushAuditAndVerify(httpMock);
  });

  it('should PUT the updated status including the disabled pkid', () => {
    const { fixture, component, httpMock, router } = setup('1');
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/1`).flush(draftStatus);

    component.form.patchValue({ description: '草稿（修改）' });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.pkid).toBe(1);
    expect(req.request.body.description).toBe('草稿（修改）');
    req.flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/publish-statuses']);
    flushAuditAndVerify(httpMock);
  });
});
