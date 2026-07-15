import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { environment } from '../../../environments/environment';
import { RowAuditBadgeComponent } from './row-audit-badge';
import { RowAuditEntry } from '../../core/models/row-audit.model';

describe('RowAuditBadgeComponent', () => {
  // Newest first, exactly as the API returns them.
  const trail: RowAuditEntry[] = [
    { dateTime: '2026-06-04T14:30:00', userName: 'alice', actionType: 'Update', actionDesc: 'Description, IsPublished' },
    { dateTime: '2026-06-01T09:00:00', userName: 'miles', actionType: 'Insert', actionDesc: '草稿' }
  ];

  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RowAuditBadgeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        providePrimeNG()
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createComponent(): ComponentFixture<RowAuditBadgeComponent> {
    const fixture = TestBed.createComponent(RowAuditBadgeComponent);
    fixture.componentRef.setInput('tableName', 'Course');
    fixture.componentRef.setInput('pkid', 123);
    fixture.detectChanges();
    return fixture;
  }

  function flushTrail(entries: RowAuditEntry[]): void {
    httpMock
      .expectOne(`${environment.apiUrl}/rowaudit?tableName=Course&pkid=123`)
      .flush(entries);
  }

  it('should fetch the trail on init and show the latest record inline on the badge', () => {
    const fixture = createComponent();
    flushTrail(trail);
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.audit-badge')!;
    expect(badge.textContent).toContain('異動紀錄 History');
    expect(badge.textContent).toContain('Update by alice · 2026-06-04 14:30');
    expect(fixture.componentInstance.latest()?.actionType).toBe('Update');
  });

  it('should open the dialog with the full trail, newest first', () => {
    const fixture = createComponent();
    flushTrail(trail);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.audit-badge')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.dialogVisible()).toBeTrue();
    // appendTo="body": the dialog renders outside the fixture element.
    const rows = Array.from(document.body.querySelectorAll('.audit-table tbody tr'));
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('alice');
    expect(rows[0].textContent).toContain('Update');
    expect(rows[0].textContent).toContain('2026-06-04 14:30:00');
    expect(rows[1].textContent).toContain('miles');
    expect(rows[1].textContent).toContain('Insert');
    expect(rows[1].textContent).toContain('草稿');
  });

  it('should show the neutral no-history state on the badge and in the dialog when the trail is empty', () => {
    const fixture = createComponent();
    flushTrail([]);
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.audit-badge')!;
    expect(badge.textContent).toContain('尚無紀錄 No history');

    (badge as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('尚無異動紀錄 No history yet');
    expect(document.body.querySelector('.audit-table')).toBeNull();
  });

  it('should degrade to the no-history state when the fetch fails', () => {
    const fixture = createComponent();
    httpMock
      .expectOne(`${environment.apiUrl}/rowaudit?tableName=Course&pkid=123`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loaded()).toBeTrue();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('.audit-badge')!;
    expect(badge.textContent).toContain('尚無紀錄 No history');
  });
});
