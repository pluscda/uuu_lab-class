import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { PartnerDetail } from './partner-detail';
import { Partner } from '../../../core/models/partner.model';

describe('PartnerDetail', () => {
  const microsoftPartner: Partner = {
    pkid: 1,
    name: 'Microsoft',
    appKey: 'MS',
    nameOnPartnerMenu: 'Microsoft 微軟原廠課程',
    nameOnCourseDetailPage: 'Microsoft',
    displayOrder: 1,
    imageFilename: 'microsoft.png'
  };

  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetail],
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
          useValue: { snapshot: { paramMap: new Map([['id', '1']]) } }
        }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should load the partner and render its fields', () => {
    const fixture = TestBed.createComponent(PartnerDetail);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/partners/1`).flush(microsoftPartner);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.partner()?.pkid).toBe(1);
    expect(component.loading()).toBeFalse();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Microsoft');
    expect(compiled.textContent).toContain('微軟原廠課程');
  });
});
