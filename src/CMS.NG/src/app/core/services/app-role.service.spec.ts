import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AppRoleService } from './app-role.service';
import { AppRole, AppRoleRequest } from '../models/app-role.model';

describe('AppRoleService', () => {
  let service: AppRoleService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/app-roles`;

  const sampleRole: AppRole = {
    pkid: 1,
    roleId: 'Admin',
    roleName: 'Administrator',
    permissionLevel: 1,
    description: '系統管理員',
    userCount: 3,
    userIds: ['helen']
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AppRoleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll should GET all roles', () => {
    service.getAll().subscribe(roles => expect(roles).toEqual([sampleRole]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([sampleRole]);
  });

  it('query should POST the filter to /query', () => {
    const query = { keyword: 'admin' };
    service.query(query).subscribe(roles => expect(roles.length).toBe(1));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([sampleRole]);
  });

  it('getById should GET a single role with encoded id', () => {
    service.getById('Role/1').subscribe(role => expect(role).toEqual(sampleRole));

    const req = httpMock.expectOne(`${baseUrl}/Role%2F1`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleRole);
  });

  it('create should POST the request body', () => {
    const request: AppRoleRequest = {
      roleId: 'Admin',
      roleName: 'Administrator',
      permissionLevel: 1,
      description: null,
      userIds: []
    };
    service.create(request).subscribe(result => expect(result.pkid).toBe(7));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ pkid: 7 });
  });

  it('update should PUT the request body (no id in route)', () => {
    const request: AppRoleRequest = {
      roleId: 'Admin',
      roleName: 'Administrator',
      permissionLevel: 1,
      description: null,
      userIds: ['helen']
    };
    service.update(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(null);
  });

  it('delete should DELETE by encoded id', () => {
    service.delete('Admin').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/Admin`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
