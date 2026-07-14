import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { PartnerService } from './partner.service';
import { Partner, PartnerRequest } from '../models/partner.model';

describe('PartnerService', () => {
  let service: PartnerService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/partners`;

  const samplePartner: Partner = {
    pkid: 1,
    name: 'Microsoft',
    appKey: 'MS',
    nameOnPartnerMenu: 'Microsoft 微軟原廠課程',
    nameOnCourseDetailPage: 'Microsoft',
    displayOrder: 1,
    imageFilename: 'microsoft.png'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PartnerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll should GET all partners', () => {
    service.getAll().subscribe(partners => expect(partners).toEqual([samplePartner]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([samplePartner]);
  });

  it('query should POST the filter to /query', () => {
    const query = { keyword: 'micro' };
    service.query(query).subscribe(partners => expect(partners.length).toBe(1));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([samplePartner]);
  });

  it('getById should GET a single partner by pkid', () => {
    service.getById(1).subscribe(partner => expect(partner).toEqual(samplePartner));

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(samplePartner);
  });

  it('create should POST the request body', () => {
    const request: PartnerRequest = {
      pkid: 0,
      name: 'Cisco',
      appKey: 'CSC',
      nameOnPartnerMenu: 'Cisco 思科原廠課程',
      nameOnCourseDetailPage: 'Cisco',
      displayOrder: 2,
      imageFilename: null
    };
    service.create(request).subscribe(result => expect(result.pkid).toBe(7));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ pkid: 7 });
  });

  it('update should PUT the request body (no id in route)', () => {
    const request: PartnerRequest = {
      pkid: 1,
      name: 'Microsoft',
      appKey: 'MS',
      nameOnPartnerMenu: 'Microsoft 微軟原廠課程',
      nameOnCourseDetailPage: 'Microsoft',
      displayOrder: 1,
      imageFilename: null
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
