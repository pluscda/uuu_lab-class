import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { RowAuditService } from './row-audit.service';
import { RowAuditEntry } from '../models/row-audit.model';

describe('RowAuditService', () => {
  let service: RowAuditService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(RowAuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getForRecord should GET /rowaudit with tableName and pkid params', () => {
    const entries: RowAuditEntry[] = [
      { dateTime: '2026-06-04T14:30:00', userName: 'alice', actionType: 'Update', actionDesc: 'Description' }
    ];
    service.getForRecord('Course', 123).subscribe(result => expect(result).toEqual(entries));

    const req = httpMock.expectOne(`${environment.apiUrl}/rowaudit?tableName=Course&pkid=123`);
    expect(req.request.method).toBe('GET');
    req.flush(entries);
  });
});
