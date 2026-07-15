import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { environment } from '../../../environments/environment';
import { AUTH_STORAGE_KEY } from '../../core/services/auth.service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: any;
  let httpMock: HttpTestingController;
  let router: Router;

  const loginUrl = `${environment.apiUrl}/auth/login`;
  const profile = {
    userId: 'helen',
    userName: 'Helen Chen',
    accessToken: `header.${btoa(JSON.stringify({ role: ['Admin'] }))}.signature`
  };

  beforeEach(async () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        providePrimeNG()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should POST credentials, store the profile and navigate home on success', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.form.setValue({ userId: 'helen', password: 'P@ssw0rd!' });

    component.submit();

    const req = httpMock.expectOne(loginUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 'helen', password: 'P@ssw0rd!' });
    req.flush(profile);

    expect(JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY)!)).toEqual(profile);
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });

  it('should show an error message on 401 and keep session storage empty', () => {
    component.form.setValue({ userId: 'helen', password: 'wrong' });

    component.submit();
    httpMock
      .expectOne(loginUrl)
      .flush({ message: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(component.errorMessage()).toBe('帳號或密碼錯誤');
    const errorEl = (fixture.nativeElement as HTMLElement).querySelector('.login-error');
    expect(errorEl?.textContent).toContain('帳號或密碼錯誤');
  });

  it('should not call the API when the form is invalid', () => {
    component.form.setValue({ userId: '', password: '' });

    component.submit();

    httpMock.expectNone(loginUrl);
    expect(component.form.controls.userId.touched).toBeTrue();
  });
});
