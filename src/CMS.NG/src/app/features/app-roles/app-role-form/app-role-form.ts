import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';
import { AppRoleRequest, AppUserLookup } from '../../../core/models/app-role.model';
import { AppRoleService } from '../../../core/services/app-role.service';
import { LookupService } from '../../../core/services/lookup.service';
import { RowAuditBadgeComponent } from '../../../shared/row-audit-badge/row-audit-badge';

@Component({
  selector: 'app-app-role-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    MultiSelectModule,
    RowAuditBadgeComponent
  ],
  templateUrl: './app-role-form.html',
  styleUrl: './app-role-form.scss'
})
export class AppRoleForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AppRoleService);
  private readonly lookupService = inject(LookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly userOptions = signal<{ value: string; label: string }[]>([]);
  // The route carries the string RoleId; the audit badge needs the surrogate
  // int pkid, so it is set from the loaded record in edit mode.
  readonly pkid = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    roleId: ['', [Validators.required, Validators.maxLength(200)]],
    roleName: ['', [Validators.required, Validators.maxLength(200)]],
    permissionLevel: [100, [Validators.required]],
    description: this.fb.control<string | null>(null, [Validators.maxLength(400)]),
    userIds: this.fb.nonNullable.control<string[]>([])
  });

  ngOnInit(): void {
    const roleId = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!roleId);

    if (roleId) {
      this.form.controls.roleId.disable();
      forkJoin({
        role: this.service.getById(roleId),
        users: this.lookupService.getAppUsers()
      }).subscribe({
        next: ({ role, users }) => {
          this.pkid.set(role.pkid);
          this.setUserOptions(users);
          this.form.patchValue({
            roleId: role.roleId,
            roleName: role.roleName,
            permissionLevel: role.permissionLevel,
            description: role.description,
            userIds: role.userIds
          });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入角色失敗' });
          this.router.navigate(['/app-roles']);
        }
      });
    } else {
      this.lookupService.getAppUsers().subscribe({
        next: users => this.setUserOptions(users),
        error: () => {
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入使用者失敗' });
        }
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue() as AppRoleRequest;
    this.saving.set(true);

    const action$: Observable<unknown> = this.isEdit()
      ? this.service.update(request)
      : this.service.create(request);

    action$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '角色已儲存' });
        this.router.navigate(['/app-roles']);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const detail = err.status === 409 ? '角色代碼已存在' : '儲存角色失敗';
        this.messageService.add({ severity: 'error', summary: '錯誤', detail });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/app-roles']);
  }

  private setUserOptions(users: AppUserLookup[]): void {
    this.userOptions.set(
      users.map(u => ({ value: u.userId, label: `${u.userName} (${u.userId})` }))
    );
  }
}
