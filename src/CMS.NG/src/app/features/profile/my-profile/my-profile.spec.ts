import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { AUTH_STORAGE_KEY, AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/auth.model';
import { MyProfile } from './my-profile';

const TOKEN = `header.${btoa(JSON.stringify({ sub: 'helen', role: ['Admin', 'Editor'] }))}.signature`;

function seedSession(): void {
  const profile: UserProfile = { userId: 'helen', userName: 'Helen Chen', accessToken: TOKEN };
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
}

describe('MyProfile', () => {
  let fixture: ComponentFixture<MyProfile>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    seedSession();
    await TestBed.configureTestingModule({
      imports: [MyProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        providePrimeNG(),
        MessageService
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MyProfile);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function userNameInput(): HTMLInputElement {
    return element().querySelector<HTMLInputElement>('#userName')!;
  }

  function typeUserName(value: string): void {
    const input = userNameInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('should show the UserId as read-only text (not an input)', () => {
    const userId = element().querySelector('.profile-user-id');
    expect(userId?.textContent).toContain('helen');
    expect(userId?.querySelector('input')).toBeNull();
  });

  it('should show the roles as read-only tags (not inputs)', () => {
    const roles = element().querySelector('.profile-roles');
    expect(roles?.textContent).toContain('Admin');
    expect(roles?.textContent).toContain('Editor');
    expect(roles?.querySelector('input, select, textarea')).toBeNull();
  });

  it('should only offer the UserName for editing, pre-filled with the current name', () => {
    expect(userNameInput().value).toBe('Helen Chen');
    // Apart from the three change-password fields, the UserName input is the
    // only editable control on the page
    expect(element().querySelectorAll('input:not([type="password"])').length).toBe(1);
    expect(element().querySelectorAll('input[type="password"]').length).toBe(3);
  });

  it('should PUT the trimmed UserName and refresh the shell (AuthService + session storage)', () => {
    const auth = TestBed.inject(AuthService);
    typeUserName('  Helen Updated  ');

    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/profile`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ userName: 'Helen Updated' });
    req.flush({ userId: 'helen', userName: 'Helen Updated' });
    fixture.detectChanges();

    // The shell topbar binds auth.userName(), so this is what refreshes it
    expect(auth.userName()).toBe('Helen Updated');
    const stored = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY)!) as UserProfile;
    expect(stored.userName).toBe('Helen Updated');
    expect(stored.userId).toBe('helen');
    expect(stored.accessToken).toBe(TOKEN);
  });

  it('should reject an empty or whitespace-only UserName without calling the API', () => {
    typeUserName('   ');

    element().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    httpMock.expectNone(`${environment.apiUrl}/auth/profile`);
    expect(element().querySelector('.field-error')?.textContent).toContain('姓名為必填');
    expect(TestBed.inject(AuthService).userName()).toBe('Helen Chen');
  });

  describe('change password', () => {
    const CHANGE_PASSWORD_URL = `${environment.apiUrl}/auth/change-password`;

    function passwordInput(id: string): HTMLInputElement {
      return element().querySelector<HTMLInputElement>(`#${id}`)!;
    }

    function typePassword(id: string, value: string): void {
      const input = passwordInput(id);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    function fillForm(current: string, next: string, confirm: string): void {
      typePassword('currentPassword', current);
      typePassword('newPassword', next);
      typePassword('confirmNewPassword', confirm);
    }

    function submitPasswordForm(): void {
      element().querySelector('form.password-form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    }

    function fieldErrors(): string {
      return Array.from(element().querySelectorAll('.password-form .field-error'))
        .map(el => el.textContent ?? '')
        .join('\n');
    }

    it('should render the three password fields as password inputs', () => {
      for (const id of ['currentPassword', 'newPassword', 'confirmNewPassword']) {
        expect(passwordInput(id).type).toBe('password');
      }
    });

    it('should require all three fields and not call the API when empty', () => {
      submitPasswordForm();

      httpMock.expectNone(CHANGE_PASSWORD_URL);
      expect(fieldErrors()).toContain('目前密碼為必填');
      expect(fieldErrors()).toContain('新密碼為必填');
      expect(fieldErrors()).toContain('確認新密碼為必填');
    });

    it('should reject a new password shorter than 8 characters without calling the API', () => {
      fillForm('OldPass1!', 'Abc1!xy', 'Abc1!xy'); // 7 chars, 4 classes

      submitPasswordForm();

      httpMock.expectNone(CHANGE_PASSWORD_URL);
      expect(fieldErrors()).toContain('密碼長度至少需 8 碼');
    });

    it('should reject a new password with fewer than 3 of the 4 character classes', () => {
      fillForm('OldPass1!', 'abcdefg1', 'abcdefg1'); // 8 chars but only lower + digit

      submitPasswordForm();

      httpMock.expectNone(CHANGE_PASSWORD_URL);
      expect(fieldErrors()).toContain('密碼長度至少需 8 碼');
    });

    it('should accept 3 of the 4 character classes (no symbol required)', () => {
      fillForm('OldPass1!', 'Abcdefg1', 'Abcdefg1'); // upper + lower + digit

      submitPasswordForm();

      const req = httpMock.expectOne(CHANGE_PASSWORD_URL);
      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('should reject mismatched new/confirm passwords without calling the API', () => {
      fillForm('OldPass1!', 'NewPass1!', 'Different1!');

      submitPasswordForm();

      httpMock.expectNone(CHANGE_PASSWORD_URL);
      expect(fieldErrors()).toContain('新密碼與確認新密碼不一致');
    });

    it('should POST the plain passwords (never hashes) and reset the form on success', () => {
      fillForm('OldPass1!', 'NewPass1!', 'NewPass1!');

      submitPasswordForm();

      const req = httpMock.expectOne(CHANGE_PASSWORD_URL);
      expect(req.request.method).toBe('POST');
      // Exactly these three plain-text fields — no hash, no userId
      expect(req.request.body).toEqual({
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
        confirmNewPassword: 'NewPass1!'
      });
      req.flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();

      expect(passwordInput('currentPassword').value).toBe('');
      expect(passwordInput('newPassword').value).toBe('');
      expect(passwordInput('confirmNewPassword').value).toBe('');
      expect(fieldErrors()).toBe('');
    });

    it('should surface the server message when the current password is wrong', () => {
      const messageService = TestBed.inject(MessageService);
      const addSpy = spyOn(messageService, 'add');
      fillForm('wrong-pass', 'NewPass1!', 'NewPass1!');

      submitPasswordForm();

      const req = httpMock.expectOne(CHANGE_PASSWORD_URL);
      req.flush(
        { message: '目前密碼不正確 (Current password is incorrect.)' },
        { status: 400, statusText: 'Bad Request' }
      );
      fixture.detectChanges();

      expect(addSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        severity: 'error',
        detail: '目前密碼不正確 (Current password is incorrect.)'
      }));
      // The form keeps its values so the user can correct the current password
      expect(passwordInput('newPassword').value).toBe('NewPass1!');
    });
  });
});
