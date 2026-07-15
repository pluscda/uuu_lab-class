import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { App } from './app';
import { AUTH_STORAGE_KEY } from './core/services/auth.service';

function seedSession(roles: string[]): void {
  const payload = btoa(JSON.stringify({ sub: 'helen', role: roles }));
  sessionStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      userId: 'helen',
      userName: 'Helen Chen',
      accessToken: `header.${payload}.signature`
    })
  );
}

describe('App', () => {
  beforeEach(async () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        providePrimeNG(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService
      ]
    }).compileComponents();
  });

  afterEach(() => sessionStorage.removeItem(AUTH_STORAGE_KEY));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should hide the shell (topbar + sidebar) when logged out', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar')).toBeNull();
    expect(compiled.querySelector('.sidebar')).toBeNull();
  });

  it('should render the sidebar and the signed-in UserName when logged in', () => {
    seedSession(['Admin']);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const groupText = Array.from(compiled.querySelectorAll('.nav-group'))
      .map(group => group.textContent)
      .join(' ');
    expect(groupText).toContain('首頁 Home');
    expect(groupText).toContain('課程管理 Course');
    const navText = Array.from(compiled.querySelectorAll('.nav-item'))
      .map(item => item.textContent)
      .join(' ');
    expect(navText).toContain('上稿作業 FeaturedPromoItem');
    expect(compiled.querySelector('.topbar-user')?.textContent).toContain('Helen Chen');
  });

  it('should show 系統管理 Admin only when the roles include "Admin"', () => {
    seedSession(['Admin', 'Editor']);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const groupText = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.nav-group')
    )
      .map(group => group.textContent)
      .join(' ');
    expect(groupText).toContain('系統管理 Admin');
  });

  it('should hide 系統管理 Admin for users without the Admin role', () => {
    seedSession(['Editor']);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const groupText = Array.from(compiled.querySelectorAll('.nav-group'))
      .map(group => group.textContent)
      .join(' ');
    expect(groupText).not.toContain('系統管理 Admin');
    // The other groups are unaffected
    expect(groupText).toContain('首頁 Home');
    expect(groupText).toContain('課程管理 Course');
  });

  it('logout should clear the session and navigate to /login', () => {
    seedSession(['Admin']);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.logout-button')!
      .click();
    fixture.detectChanges();

    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect((fixture.nativeElement as HTMLElement).querySelector('.sidebar')).toBeNull();
  });

  it('should toggle sidebar collapsed state', () => {
    seedSession(['Admin']);
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as any;
    expect(app.sidebarCollapsed()).toBeFalse();
    app.toggleSidebar();
    expect(app.sidebarCollapsed()).toBeTrue();
  });
});
