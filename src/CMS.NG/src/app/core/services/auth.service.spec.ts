import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AUTH_STORAGE_KEY, AuthService } from './auth.service';
import { UserProfile } from '../models/auth.model';

function fakeToken(role: string[] | string): string {
  // Only the payload (middle segment) is decoded client-side
  const payload = btoa(JSON.stringify({ sub: 'helen', role }));
  return `header.${payload}.signature`;
}

function fakeProfile(role: string[] | string): UserProfile {
  return { userId: 'helen', userName: 'Helen Chen', accessToken: fakeToken(role) };
}

describe('AuthService', () => {
  beforeEach(() => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
  });

  afterEach(() => sessionStorage.removeItem(AUTH_STORAGE_KEY));

  it('login should POST credentials and store the profile in SESSION storage', () => {
    const service = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    const profile = fakeProfile(['Admin']);

    service.login({ userId: 'helen', password: 'pw' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 'helen', password: 'pw' });
    req.flush(profile);

    expect(JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY)!)).toEqual(profile);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.userName()).toBe('Helen Chen');
    expect(service.accessToken).toBe(profile.accessToken);
    httpMock.verify();
  });

  it('should restore the profile from session storage on creation', () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fakeProfile(['Editor'])));

    const service = TestBed.inject(AuthService);

    expect(service.isLoggedIn()).toBeTrue();
    expect(service.userName()).toBe('Helen Chen');
  });

  it('should decode role claims from the token (array and single string)', () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fakeProfile(['Admin', 'Editor'])));
    let service = TestBed.inject(AuthService);
    expect(service.roles()).toEqual(['Admin', 'Editor']);
    expect(service.isAdmin()).toBeTrue();

    // A user with exactly one role gets a plain string claim, not an array
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fakeProfile('Editor')));
    service = TestBed.inject(AuthService);
    expect(service.roles()).toEqual(['Editor']);
    expect(service.isAdmin()).toBeFalse();
  });

  it('should report no roles and not-admin when logged out', () => {
    const service = TestBed.inject(AuthService);

    expect(service.isLoggedIn()).toBeFalse();
    expect(service.roles()).toEqual([]);
    expect(service.isAdmin()).toBeFalse();
    expect(service.accessToken).toBeNull();
  });

  it('logout should clear session storage and navigate to /login', () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fakeProfile(['Admin'])));
    const service = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    service.logout();

    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
