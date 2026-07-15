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

  it('getAppRoles should GET the app-roles lookup', () => {
    const roles = [{ roleId: 'Admin', roleName: 'Administrator' }];
    service.getAppRoles().subscribe(result => expect(result).toEqual(roles));

    const req = httpMock.expectOne(`${environment.apiUrl}/lookups/app-roles`);
    expect(req.request.method).toBe('GET');
    req.flush(roles);
  });

  it('getPublishStatuses should GET the publish-statuses lookup', () => {
    const statuses = [{ pkid: 1, description: '草稿' }];
    service.getPublishStatuses().subscribe(result => expect(result).toEqual(statuses));

    const req = httpMock.expectOne(`${environment.apiUrl}/lookups/publish-statuses`);
    expect(req.request.method).toBe('GET');
    req.flush(statuses);
  });

  it('getPartners should GET the partners lookup', () => {
    const partners = [{ pkid: 1, name: 'Microsoft' }];
    service.getPartners().subscribe(result => expect(result).toEqual(partners));

    const req = httpMock.expectOne(`${environment.apiUrl}/lookups/partners`);
    expect(req.request.method).toBe('GET');
    req.flush(partners);
  });

  it('getCourseGroups should GET the course-groups lookup', () => {
    const groups = [{ pkid: 1, description: '雲端運算' }];
    service.getCourseGroups().subscribe(result => expect(result).toEqual(groups));

    const req = httpMock.expectOne(`${environment.apiUrl}/lookups/course-groups`);
    expect(req.request.method).toBe('GET');
    req.flush(groups);
  });

  it('getCertifications should GET the certifications lookup', () => {
    const certifications = [{ pkid: 10, partnerPkid: 1, title: 'Azure Fundamentals' }];
    service.getCertifications().subscribe(result => expect(result).toEqual(certifications));

    const req = httpMock.expectOne(`${environment.apiUrl}/lookups/certifications`);
    expect(req.request.method).toBe('GET');
    req.flush(certifications);
  });

  it('getJobCategories should GET the job-categories lookup', () => {
    const jobCategories = [{ pkid: 1, description: '系統工程師' }];
    service.getJobCategories().subscribe(result => expect(result).toEqual(jobCategories));

    const req = httpMock.expectOne(`${environment.apiUrl}/lookups/job-categories`);
    expect(req.request.method).toBe('GET');
    req.flush(jobCategories);
  });

  it('getCourses should GET the courses lookup', () => {
    const courses = [{ pkid: 1, courseId: 'AZ-900', title: 'Azure 基礎課程' }];
    service.getCourses().subscribe(result => expect(result).toEqual(courses));

    const req = httpMock.expectOne(`${environment.apiUrl}/lookups/courses`);
    expect(req.request.method).toBe('GET');
    req.flush(courses);
  });

  it('getTrainingCenters should GET the training-centers lookup', () => {
    const centers = [
      { pkid: 1, name: '台北' },
      { pkid: 2, name: '新竹' }
    ];
    service.getTrainingCenters().subscribe(result => expect(result).toEqual(centers));

    const req = httpMock.expectOne(`${environment.apiUrl}/lookups/training-centers`);
    expect(req.request.method).toBe('GET');
    req.flush(centers);
  });

  it('getPromotions should GET the promotions lookup with the keyword param', () => {
    const promotions = [
      {
        pkid: 10,
        promoCode: '20251204_SkillTrainAI',
        topic: '成為能AI協作的程式設計師',
        description: '轉職就業養成班'
      }
    ];
    service.getPromotions('20251204').subscribe(result => expect(result).toEqual(promotions));

    const req = httpMock.expectOne(
      r =>
        r.url === `${environment.apiUrl}/lookups/promotions` &&
        r.params.get('keyword') === '20251204'
    );
    expect(req.request.method).toBe('GET');
    req.flush(promotions);
  });

  it('getPromotions without keyword should GET the promotions lookup with no params', () => {
    service.getPromotions().subscribe(result => expect(result).toEqual([]));

    const req = httpMock.expectOne(
      r => r.url === `${environment.apiUrl}/lookups/promotions` && r.params.keys().length === 0
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
