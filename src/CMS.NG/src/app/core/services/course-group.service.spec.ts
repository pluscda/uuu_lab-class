import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { CourseGroupService } from './course-group.service';
import { CourseGroup, CourseGroupRequest } from '../models/course-group.model';

describe('CourseGroupService', () => {
  let service: CourseGroupService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/course-groups`;

  const sampleGroup: CourseGroup = {
    pkid: 1,
    description: '雲端運算'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CourseGroupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll should GET all course groups', () => {
    service.getAll().subscribe(groups => expect(groups).toEqual([sampleGroup]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([sampleGroup]);
  });

  it('query should POST the filter to /query', () => {
    const query = { keyword: '雲端' };
    service.query(query).subscribe(groups => expect(groups.length).toBe(1));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([sampleGroup]);
  });

  it('getById should GET a single group by pkid', () => {
    service.getById(1).subscribe(group => expect(group).toEqual(sampleGroup));

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleGroup);
  });

  it('create should POST the request body', () => {
    const request: CourseGroupRequest = { pkid: 0, description: '資訊安全' };
    service.create(request).subscribe(result => expect(result.pkid).toBe(7));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ pkid: 7 });
  });

  it('update should PUT the request body (no id in route)', () => {
    const request: CourseGroupRequest = { pkid: 1, description: '雲端運算（修改）' };
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
