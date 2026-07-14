import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { PartnerList } from './partner-list';
import { Partner } from '../../../core/models/partner.model';

describe('PartnerList', () => {
  let fixture: ComponentFixture<PartnerList>;
  let component: PartnerList;
  let httpMock: HttpTestingController;
  let router: Router;
  const queryUrl = `${environment.apiUrl}/partners/query`;

  const partners: Partner[] = [
    {
      pkid: 1,
      name: 'Microsoft',
      appKey: 'MS',
      nameOnPartnerMenu: 'Microsoft 微軟原廠課程',
      nameOnCourseDetailPage: 'Microsoft',
      displayOrder: 1,
      imageFilename: 'microsoft.png'
    },
    {
      pkid: 2,
      name: 'Cisco',
      appKey: 'CSC',
      nameOnPartnerMenu: 'Cisco 思科原廠課程',
      nameOnCourseDetailPage: 'Cisco',
      displayOrder: 2,
      imageFilename: null
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PartnerList],
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

    fixture = TestBed.createComponent(PartnerList);
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
    req.flush(partners);
    fixture.detectChanges();
  }

  it('should load partners on init via query endpoint', () => {
    flushInitialQuery();
    expect(component.partners().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('should render partner rows in the table', () => {
    flushInitialQuery();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Microsoft');
    expect(rows[1].textContent).toContain('Cisco');
  });

  it('applyFilters should persist filters to session storage and re-query', () => {
    flushInitialQuery();

    component.filters.keyword = 'micro';
    component.applyFilters();

    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('micro');
    req.flush([partners[0]]);

    const saved = JSON.parse(sessionStorage.getItem('partner-list-filters')!);
    expect(saved.keyword).toBe('micro');
    expect(component.partners().length).toBe(1);
  });

  it('should restore filters from session storage on init', () => {
    sessionStorage.setItem('partner-list-filters', JSON.stringify({ keyword: 'cisco' }));

    fixture.detectChanges();
    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('cisco');
    req.flush([partners[1]]);

    expect(component.filters.keyword).toBe('cisco');
  });

  it('view/edit/add should navigate to the expected routes', () => {
    const navigateSpy = spyOn(router, 'navigate');
    flushInitialQuery();

    component.view(partners[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/partners', 1]);

    component.edit(partners[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/partners', 1, 'edit']);

    component.add();
    expect(navigateSpy).toHaveBeenCalledWith(['/partners/new']);
  });

  it('delete (via confirm accept) should call DELETE and reload', () => {
    const confirmationService = TestBed.inject(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
      options.accept();
      return confirmationService;
    });
    flushInitialQuery();

    component.confirmDelete(partners[0]);

    const deleteReq = httpMock.expectOne(`${environment.apiUrl}/partners/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const reload = httpMock.expectOne(queryUrl);
    reload.flush([partners[1]]);
    expect(component.partners().length).toBe(1);
  });
});
