import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { CourseService } from './course.service';
import { Course, CourseRequest } from '../models/course.model';

describe('CourseService', () => {
  let service: CourseService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/courses`;

  const sampleCourse: Course = {
    pkid: 1,
    title: 'Azure 基礎課程',
    officialTitle: null,
    courseId: 'AZ-900',
    prodCourseId: 'PAZ900',
    friendlyUrl: 'az-900',
    displayOrder: 1,
    partnerPkid: 1,
    courseGroupPkid: 2,
    publishStatusPkid: 2,
    scheduleOn: '2026-01-01',
    scheduleOff: '2036-01-01',
    hour: 8,
    listPrice: 12000,
    learningCredit: 1.5,
    material: null,
    objective: null,
    target: null,
    prerequisites: null,
    outline: null,
    towardCertOrExam: null,
    note: null,
    otherInfo: null,
    canRepeat: true,
    partnerName: 'Microsoft',
    courseGroupDescription: '雲端運算',
    publishStatusDescription: '已發布',
    certificationPkids: [10],
    jobCategoryPkids: [1]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CourseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll should GET all courses', () => {
    service.getAll().subscribe(courses => expect(courses).toEqual([sampleCourse]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([sampleCourse]);
  });

  it('query should POST the filter to /query', () => {
    const query = { keyword: 'azure', partnerPkid: 1, canRepeat: true };
    service.query(query).subscribe(courses => expect(courses.length).toBe(1));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([sampleCourse]);
  });

  it('getById should GET a single course by pkid', () => {
    service.getById(1).subscribe(course => expect(course).toEqual(sampleCourse));

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleCourse);
  });

  it('create should POST the request body including relation pkid lists', () => {
    const request = { ...sampleCourse, pkid: 0 } as CourseRequest;
    service.create(request).subscribe(result => expect(result.pkid).toBe(7));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.certificationPkids).toEqual([10]);
    expect(req.request.body.jobCategoryPkids).toEqual([1]);
    req.flush({ pkid: 7 });
  });

  it('update should PUT the request body (no id in route)', () => {
    const request = { ...sampleCourse } as CourseRequest;
    service.update(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.pkid).toBe(1);
    req.flush(null);
  });

  it('delete should DELETE by pkid', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
