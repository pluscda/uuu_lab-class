import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { PartnerForm } from './partner-form';
import { Partner } from '../../../core/models/partner.model';

const baseUrl = `${environment.apiUrl}/partners`;

// In edit mode the toolbar RowAuditBadge fetches the record's audit trail;
// flush it (when present) so verify() only guards the form's own requests.
function flushAuditAndVerify(httpMock: HttpTestingController): void {
  httpMock.match(req => req.url === `${environment.apiUrl}/rowaudit`).forEach(req => req.flush([]));
  httpMock.verify();
}

const microsoftPartner: Partner = {
  pkid: 1,
  name: 'Microsoft',
  appKey: 'MS',
  nameOnPartnerMenu: 'Microsoft 微軟原廠課程',
  nameOnCourseDetailPage: 'Microsoft',
  displayOrder: 1,
  imageFilename: 'microsoft.png'
};

function setup(routeId: string | null): {
  fixture: ComponentFixture<PartnerForm>;
  component: PartnerForm;
  httpMock: HttpTestingController;
  router: Router;
} {
  TestBed.configureTestingModule({
    imports: [PartnerForm],
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

  const fixture = TestBed.createComponent(PartnerForm);
  return {
    fixture,
    component: fixture.componentInstance,
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router)
  };
}

describe('PartnerForm (add mode)', () => {
  it('should start with an empty form in add mode', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();

    expect(component.isEdit()).toBeFalse();
    expect(component.form.controls.name.value).toBe('');
    expect(component.form.controls.displayOrder.value).toBe(0);
    flushAuditAndVerify(httpMock);
  });

  it('should not submit when the form is invalid', () => {
    const { fixture, component, httpMock } = setup(null);
    fixture.detectChanges();

    component.save();

    httpMock.expectNone(baseUrl);
    expect(component.form.controls.name.touched).toBeTrue();
    expect(component.form.controls.appKey.touched).toBeTrue();
    flushAuditAndVerify(httpMock);
  });

  it('should POST a new partner and navigate back to the list', () => {
    const { fixture, component, httpMock, router } = setup(null);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    component.form.patchValue({
      name: 'Cisco',
      appKey: 'CSC',
      nameOnPartnerMenu: 'Cisco 思科原廠課程',
      nameOnCourseDetailPage: 'Cisco',
      displayOrder: 2
    });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe('Cisco');
    expect(req.request.body.appKey).toBe('CSC');
    req.flush({ pkid: 7 });

    expect(navigateSpy).toHaveBeenCalledWith(['/partners']);
    flushAuditAndVerify(httpMock);
  });
});

describe('PartnerForm (edit mode)', () => {
  it('should load the partner and patch the form', () => {
    const { fixture, component, httpMock } = setup('1');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/1`).flush(microsoftPartner);

    expect(component.isEdit()).toBeTrue();
    expect(component.form.controls.name.value).toBe('Microsoft');
    expect(component.form.controls.pkid.value).toBe(1);
    expect(component.form.controls.imageFilename.value).toBe('microsoft.png');
    flushAuditAndVerify(httpMock);
  });

  it('should PUT the updated partner with the pkid from the loaded record', () => {
    const { fixture, component, httpMock, router } = setup('1');
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/1`).flush(microsoftPartner);

    component.form.patchValue({ name: 'Microsoft Taiwan' });
    component.save();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.pkid).toBe(1);
    expect(req.request.body.name).toBe('Microsoft Taiwan');
    req.flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/partners']);
    flushAuditAndVerify(httpMock);
  });
});
