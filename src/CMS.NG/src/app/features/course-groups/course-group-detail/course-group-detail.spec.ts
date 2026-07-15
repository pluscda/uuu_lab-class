import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { CourseGroupDetail } from './course-group-detail';
import { CourseGroup } from '../../../core/models/course-group.model';

describe('CourseGroupDetail', () => {
  const cloudGroup: CourseGroup = { pkid: 1, description: '雲端運算' };

  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseGroupDetail],
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

  afterEach(() => {
    // The toolbar RowAuditBadge fetches the record's audit trail once loaded.
    httpMock.match(req => req.url === `${environment.apiUrl}/rowaudit`).forEach(req => req.flush([]));
    httpMock.verify();
  });

  it('should load the group and render its fields', () => {
    const fixture = TestBed.createComponent(CourseGroupDetail);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/course-groups/1`).flush(cloudGroup);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.group()?.pkid).toBe(1);
    expect(component.loading()).toBeFalse();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('雲端運算');
    expect(compiled.textContent).toContain('主代碼');
  });
});
