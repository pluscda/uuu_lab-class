import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AppRoleLookup, AppUserRequest } from '../../../core/models/app-user.model';
import { AppUserService } from '../../../core/services/app-user.service';
import { AuthService } from '../../../core/services/auth.service';
import { LookupService } from '../../../core/services/lookup.service';
import { RowAuditBadgeComponent } from '../../../shared/row-audit-badge/row-audit-badge';

@Component({
  selector: 'app-app-user-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    MultiSelectModule,
    RowAuditBadgeComponent
  ],
  templateUrl: './app-user-form.html',
  styleUrl: './app-user-form.scss'
})
export class AppUserForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AppUserService);
  private readonly lookupService = inject(LookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  // Reset-to-default-password is Admin-only: the button is hidden for everyone
  // else, and the API enforces the same rule server-side (403 for non-Admins).
  protected readonly auth = inject(AuthService);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly resetting = signal(false);
  // The route carries the string UserId; the audit badge needs the surrogate
  // int pkid, so it is set from the loaded record in edit mode.
  readonly pkid = signal<number | null>(null);
  readonly roleOptions = signal<{ value: string; label: string }[]>([]);

  // No password field: PasswordHash is backend-only and seeded from the
  // SysConfig default password on create.
  readonly form = this.fb.nonNullable.group({
    userId: ['', [Validators.required, Validators.maxLength(200)]],
    userName: ['', [Validators.required, Validators.maxLength(200)]],
    isActive: [true],
    roleIds: this.fb.nonNullable.control<string[]>([])
  });

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!userId);

    if (userId) {
      this.form.controls.userId.disable();
      forkJoin({
        user: this.service.getById(userId),
        roles: this.lookupService.getAppRoles()
      }).subscribe({
        next: ({ user, roles }) => {
          this.pkid.set(user.pkid);
          this.setRoleOptions(roles);
          this.form.patchValue({
            userId: user.userId,
            userName: user.userName,
            isActive: user.isActive,
            roleIds: user.roleIds
          });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入使用者失敗' });
          this.router.navigate(['/app-users']);
        }
      });
    } else {
      this.lookupService.getAppRoles().subscribe({
        next: roles => this.setRoleOptions(roles),
        error: () => {
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入角色失敗' });
        }
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue() as AppUserRequest;
    this.saving.set(true);

    const action$: Observable<unknown> = this.isEdit()
      ? this.service.update(request)
      : this.service.create(request);

    action$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '使用者已儲存' });
        this.router.navigate(['/app-users']);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const detail = err.status === 409 ? '使用者代碼已存在' : '儲存使用者失敗';
        this.messageService.add({ severity: 'error', summary: '錯誤', detail });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/app-users']);
  }

  confirmResetPassword(): void {
    const userId = this.form.getRawValue().userId;
    this.confirmationService.confirm({
      header: '重設密碼確認',
      message: `確定要將「${userId}」的密碼重設為系統預設密碼？`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: '重設密碼', severity: 'danger' },
      rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
      accept: () => this.resetPassword(userId)
    });
  }

  // Only the UserId is sent — the backend derives the default password from
  // SysConfig and no password/hash ever crosses the wire.
  private resetPassword(userId: string): void {
    this.resetting.set(true);
    this.service.resetPassword(userId).subscribe({
      next: () => {
        this.resetting.set(false);
        this.messageService.add({ severity: 'success', summary: '成功', detail: '密碼已重設為系統預設密碼' });
      },
      error: () => {
        this.resetting.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '重設密碼失敗' });
      }
    });
  }

  private setRoleOptions(roles: AppRoleLookup[]): void {
    this.roleOptions.set(
      roles.map(r => ({ value: r.roleId, label: `${r.roleName} (${r.roleId})` }))
    );
  }
}
