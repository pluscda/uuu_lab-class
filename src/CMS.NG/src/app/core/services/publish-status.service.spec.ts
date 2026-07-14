import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { PublishStatusService } from './publish-status.service';
import { PublishStatus, PublishStatusRequest } from '../models/publish-status.model';

describe('PublishStatusService', () => {
  let service: PublishStatusService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/publish-statuses`;

  const sampleStatus: PublishStatus = {
    pkid: 1,
    description: '草稿',
    isDraft: true,
    isPublished: false,
    isDiscontinued: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PublishStatusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll should GET all publish statuses', () => {
    service.getAll().subscribe(statuses => expect(statuses).toEqual([sampleStatus]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([sampleStatus]);
  });

  it('query should POST the filter to /query', () => {
    const query = { keyword: '草稿', isDraft: true };
    service.query(query).subscribe(statuses => expect(statuses.length).toBe(1));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([sampleStatus]);
  });

  it('getById should GET a single status by pkid', () => {
    service.getById(1).subscribe(status => expect(status).toEqual(sampleStatus));

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleStatus);
  });

  it('create should POST the request body', () => {
    const request: PublishStatusRequest = {
      pkid: 3,
      description: '已下架',
      isDraft: false,
      isPublished: false,
      isDiscontinued: true
    };
    service.create(request).subscribe(result => expect(result.pkid).toBe(3));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ pkid: 3 });
  });

  it('update should PUT the request body (no id in route)', () => {
    const request: PublishStatusRequest = {
      pkid: 1,
      description: '草稿（修改）',
      isDraft: true,
      isPublished: false,
      isDiscontinued: false
    };
    service.update(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(null);
  });

  it('delete should DELETE by pkid', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
