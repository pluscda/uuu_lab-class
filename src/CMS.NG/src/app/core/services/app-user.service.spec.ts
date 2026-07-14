import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AppUserService } from './app-user.service';
import { AppUser, AppUserRequest } from '../models/app-user.model';

describe('AppUserService', () => {
  let service: AppUserService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/app-users`;

  const sampleUser: AppUser = {
    pkid: 1,
    userId: 'helen',
    userName: 'Helen Chen',
    isActive: true,
    passwordUpdatedTime: null,
    roleCount: 2,
    roleIds: ['Admin']
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AppUserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll should GET all users', () => {
    service.getAll().subscribe(users => expect(users).toEqual([sampleUser]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([sampleUser]);
  });

  it('query should POST the filter to /query', () => {
    const query = { keyword: 'helen', isActive: true };
    service.query(query).subscribe(users => expect(users.length).toBe(1));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([sampleUser]);
  });

  it('getById should GET a single user with encoded id', () => {
    service.getById('user/1').subscribe(user => expect(user).toEqual(sampleUser));

    const req = httpMock.expectOne(`${baseUrl}/user%2F1`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleUser);
  });

  it('create should POST the request body without any password field', () => {
    const request: AppUserRequest = {
      userId: 'helen',
      userName: 'Helen Chen',
      isActive: true,
      roleIds: ['Admin']
    };
    service.create(request).subscribe(result => expect(result.pkid).toBe(7));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect('passwordHash' in req.request.body).toBeFalse();
    req.flush({ pkid: 7 });
  });

  it('update should PUT the request body (no id in route)', () => {
    const request: AppUserRequest = {
      userId: 'helen',
      userName: 'Helen Chen',
      isActive: false,
      roleIds: []
    };
    service.update(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    expect('passwordHash' in req.request.body).toBeFalse();
    req.flush(null);
  });

  it('delete should DELETE by encoded id', () => {
    service.delete('miles@uuu.com.tw').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/miles%40uuu.com.tw`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('resetPassword should POST to /reset-password with encoded id and empty body', () => {
    service.resetPassword('user/1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/user%2F1/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });
});
