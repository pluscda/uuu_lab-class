import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AUTH_STORAGE_KEY } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const TOKEN = `header.${btoa(JSON.stringify({ role: ['Admin'] }))}.signature`;

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  function configure(loggedIn: boolean): void {
    if (loggedIn) {
      sessionStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ userId: 'helen', userName: 'Helen Chen', accessToken: TOKEN })
      );
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  }

  beforeEach(() => sessionStorage.removeItem(AUTH_STORAGE_KEY));
  afterEach(() => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    httpMock.verify();
  });

  it('should attach the session token as Authorization: Bearer', () => {
    configure(true);

    http.get(`${environment.apiUrl}/courses`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/courses`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    req.flush([]);
  });

  it('should send no Authorization header when there is no session token', () => {
    configure(false);

    http.get(`${environment.apiUrl}/courses`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/courses`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('on 401 should clear session storage and redirect to /login', () => {
    configure(true);
    const navigateSpy = spyOn(router, 'navigate');
    let caughtStatus = 0;

    http.get(`${environment.apiUrl}/courses`).subscribe({
      error: err => (caughtStatus = err.status)
    });
    httpMock
      .expectOne(`${environment.apiUrl}/courses`)
      .flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(caughtStatus).toBe(401); // error still propagates to the caller
  });

  it('should not redirect on a 401 from the login endpoint (wrong credentials case)', () => {
    configure(false);
    const navigateSpy = spyOn(router, 'navigate');

    http.post(`${environment.apiUrl}/auth/login`, { userId: 'x', password: 'y' }).subscribe({
      error: () => {}
    });
    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ message: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should not clear the session on non-401 errors', () => {
    configure(true);
    const navigateSpy = spyOn(router, 'navigate');

    http.get(`${environment.apiUrl}/courses`).subscribe({ error: () => {} });
    httpMock
      .expectOne(`${environment.apiUrl}/courses`)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
