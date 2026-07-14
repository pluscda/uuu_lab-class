import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        providePrimeNG(),
        ConfirmationService,
        MessageService
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the sidebar with the Admin nav group and its items', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.nav-group')?.textContent).toContain('系統管理 Admin');
    const navText = Array.from(compiled.querySelectorAll('.nav-item'))
      .map(item => item.textContent)
      .join(' ');
    expect(navText).toContain('使用者 AppUser');
    expect(navText).toContain('角色 AppRole');
  });

  it('should toggle sidebar collapsed state', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as any;
    expect(app.sidebarCollapsed()).toBeFalse();
    app.toggleSidebar();
    expect(app.sidebarCollapsed()).toBeTrue();
  });
});
