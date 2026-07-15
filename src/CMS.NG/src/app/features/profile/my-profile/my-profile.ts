import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../core/services/auth.service';

// Same rule and wording as the server: length >= 8 and at least 3 of the 4
// classes (anything outside A-Z/a-z/0-9 counts as a symbol).
export const PASSWORD_COMPLEXITY_MESSAGE =
  '密碼長度至少需 8 碼，且內容須至少包含四種字元的其中三種：大寫英文／小寫英文／數字／符號 ' +
  '(Password must be at least 8 characters and contain at least 3 of the 4 classes: ' +
  'uppercase / lowercase / digit / symbol.)';

function passwordComplexity(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null; // emptiness is the required validator's job
  const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(re => re.test(value)).length;
  return value.length >= 8 && classes >= 3 ? null : { complexity: true };
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value as string;
  const confirm = group.get('confirmNewPassword')?.value as string;
  return newPassword && confirm && newPassword !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-my-profile',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TagModule],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.scss'
})
export class MyProfile {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly messageService = inject(MessageService);
  protected readonly auth = inject(AuthService);

  protected readonly saving = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly complexityMessage = PASSWORD_COMPLEXITY_MESSAGE;

  protected readonly form = this.fb.group({
    userName: [this.auth.profile()?.userName ?? '', Validators.required]
  });

  protected readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordComplexity]],
      confirmNewPassword: ['', Validators.required]
    },
    { validators: passwordsMatch }
  );

  save(): void {
    const userName = this.form.getRawValue().userName.trim();
    if (!userName) {
      this.form.controls.userName.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.auth.updateUserName(userName).subscribe({
      next: profile => {
        this.saving.set(false);
        this.form.patchValue({ userName: profile.userName });
        this.form.markAsPristine();
        this.messageService.add({ severity: 'success', summary: '成功', detail: '個人資料已儲存' });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '儲存個人資料失敗' });
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.changingPassword.set(true);
    this.auth.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordForm.reset();
        this.messageService.add({ severity: 'success', summary: '成功', detail: '密碼已變更' });
      },
      error: (error: HttpErrorResponse) => {
        this.changingPassword.set(false);
        // Surface the server's bilingual message (wrong current password /
        // complexity) when it sent one
        const message = (error.error as { message?: string } | null)?.message ?? '變更密碼失敗';
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: message });
      }
    });
  }
}
