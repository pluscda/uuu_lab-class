import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { LookupService } from './lookup.service';

describe('LookupService', () => {
  let service: LookupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(LookupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAppUsers should GET the app-users lookup', () => {
    const users = [{ userId: 'helen', userName: 'helen', isActive: true }];
    service.getAppUsers().subscribe(result => expect(result).toEqual(users));

    const req = httpMock.expectOne(`${environment.apiUrl}/lookups/app-users`);
    expect(req.request.method).toBe('GET');
    req.flush(users);
  });
});
