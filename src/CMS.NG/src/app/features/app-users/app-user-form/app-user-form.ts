import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';
import { AppRoleLookup, AppUserRequest } from '../../../core/models/app-user.model';
import { AppUserService } from '../../../core/services/app-user.service';
import { LookupService } from '../../../core/services/lookup.service';

@Component({
  selector: 'app-app-user-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    MultiSelectModule
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
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
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

  private setRoleOptions(roles: AppRoleLookup[]): void {
    this.roleOptions.set(
      roles.map(r => ({ value: r.roleId, label: `${r.roleName} (${r.roleId})` }))
    );
  }
}
