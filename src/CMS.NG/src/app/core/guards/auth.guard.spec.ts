import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AUTH_STORAGE_KEY } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
  });

  afterEach(() => sessionStorage.removeItem(AUTH_STORAGE_KEY));

  it('should redirect to /login when there is no token in session storage', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('should allow activation when a token is in session storage', () => {
    sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ userId: 'helen', userName: 'Helen Chen', accessToken: 'h.p.s' })
    );

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBeTrue();
  });
});
