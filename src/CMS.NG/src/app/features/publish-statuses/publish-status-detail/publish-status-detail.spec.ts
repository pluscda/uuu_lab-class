import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { PublishStatusDetail } from './publish-status-detail';
import { PublishStatus } from '../../../core/models/publish-status.model';

describe('PublishStatusDetail', () => {
  const draftStatus: PublishStatus = {
    pkid: 1,
    description: '草稿',
    isDraft: true,
    isPublished: false,
    isDiscontinued: false
  };

  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishStatusDetail],
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

  it('should load the status and render its fields', () => {
    const fixture = TestBed.createComponent(PublishStatusDetail);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/publish-statuses/1`).flush(draftStatus);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.status()?.pkid).toBe(1);
    expect(component.loading()).toBeFalse();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('草稿');
    expect(compiled.textContent).toContain('主代碼');
  });
});
