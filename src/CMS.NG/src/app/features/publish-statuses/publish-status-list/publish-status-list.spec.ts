import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { PublishStatusList } from './publish-status-list';
import { PublishStatus } from '../../../core/models/publish-status.model';

describe('PublishStatusList', () => {
  let fixture: ComponentFixture<PublishStatusList>;
  let component: PublishStatusList;
  let httpMock: HttpTestingController;
  let router: Router;
  const queryUrl = `${environment.apiUrl}/publish-statuses/query`;

  const statuses: PublishStatus[] = [
    {
      pkid: 1,
      description: '草稿',
      isDraft: true,
      isPublished: false,
      isDiscontinued: false
    },
    {
      pkid: 2,
      description: '已發布',
      isDraft: false,
      isPublished: true,
      isDiscontinued: false
    }
  ];

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PublishStatusList],
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

    fixture = TestBed.createComponent(PublishStatusList);
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
    req.flush(statuses);
    fixture.detectChanges();
  }

  it('should load statuses on init via query endpoint', () => {
    flushInitialQuery();
    expect(component.statuses().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('should render status rows in the table', () => {
    flushInitialQuery();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('草稿');
    expect(rows[1].textContent).toContain('已發布');
  });

  it('applyFilters should persist filters to session storage and re-query', () => {
    flushInitialQuery();

    component.filters.isPublished = true;
    component.applyFilters();

    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.isPublished).toBeTrue();
    req.flush([statuses[1]]);

    const saved = JSON.parse(sessionStorage.getItem('publish-status-list-filters')!);
    expect(saved.isPublished).toBeTrue();
    expect(component.statuses().length).toBe(1);
  });

  it('should restore filters from session storage on init', () => {
    sessionStorage.setItem('publish-status-list-filters', JSON.stringify({ keyword: '草稿' }));

    fixture.detectChanges();
    const req = httpMock.expectOne(queryUrl);
    expect(req.request.body.keyword).toBe('草稿');
    req.flush([statuses[0]]);

    expect(component.filters.keyword).toBe('草稿');
  });

  it('view/edit/add should navigate to the expected routes', () => {
    const navigateSpy = spyOn(router, 'navigate');
    flushInitialQuery();

    component.view(statuses[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/publish-statuses', 1]);

    component.edit(statuses[0]);
    expect(navigateSpy).toHaveBeenCalledWith(['/publish-statuses', 1, 'edit']);

    component.add();
    expect(navigateSpy).toHaveBeenCalledWith(['/publish-statuses/new']);
  });

  it('delete (via confirm accept) should call DELETE and reload', () => {
    const confirmationService = TestBed.inject(ConfirmationService);
    spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
      options.accept();
      return confirmationService;
    });
    flushInitialQuery();

    component.confirmDelete(statuses[0]);

    const deleteReq = httpMock.expectOne(`${environment.apiUrl}/publish-statuses/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const reload = httpMock.expectOne(queryUrl);
    reload.flush([statuses[1]]);
    expect(component.statuses().length).toBe(1);
  });
});
