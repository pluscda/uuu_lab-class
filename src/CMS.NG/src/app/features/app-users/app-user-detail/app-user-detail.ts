import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AppRoleLookup, AppUser } from '../../../core/models/app-user.model';
import { AppUserService } from '../../../core/services/app-user.service';
import { AuthService } from '../../../core/services/auth.service';
import { LookupService } from '../../../core/services/lookup.service';
import { RowAuditBadgeComponent } from '../../../shared/row-audit-badge/row-audit-badge';

@Component({
  selector: 'app-app-user-detail',
  imports: [DatePipe, ButtonModule, TagModule, RowAuditBadgeComponent],
  templateUrl: './app-user-detail.html',
  styleUrl: './app-user-detail.scss'
})
export class AppUserDetail implements OnInit {
  private readonly service = inject(AppUserService);
  private readonly lookupService = inject(LookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  // Reset-to-default-password is Admin-only (the API also enforces this: 403)
  protected readonly auth = inject(AuthService);

  readonly user = signal<AppUser | null>(null);
  readonly roles = signal<AppRoleLookup[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      user: this.service.getById(userId),
      roles: this.lookupService.getAppRoles()
    }).subscribe({
      next: ({ user, roles }) => {
        this.user.set(user);
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入使用者失敗' });
        this.router.navigate(['/app-users']);
      }
    });
  }

  roleLabel(roleId: string): string {
    const role = this.roles().find(r => r.roleId === roleId);
    return role ? `${role.roleName} (${role.roleId})` : roleId;
  }

  confirmResetPassword(): void {
    const user = this.user();
    if (!user) return;
    this.confirmationService.confirm({
      header: '重設密碼確認',
      message: `確定要將「${user.userId}」的密碼重設為系統預設密碼？`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: '重設密碼', severity: 'danger' },
      rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
      accept: () => this.resetPassword(user)
    });
  }

  back(): void {
    this.router.navigate(['/app-users']);
  }

  edit(): void {
    const user = this.user();
    if (user) {
      this.router.navigate(['/app-users', user.userId, 'edit']);
    }
  }

  private resetPassword(user: AppUser): void {
    this.service.resetPassword(user.userId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '密碼已重設' });
        // reload to reflect the new PasswordUpdatedTime
        this.service.getById(user.userId).subscribe({
          next: refreshed => this.user.set(refreshed)
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '重設密碼失敗' });
      }
    });
  }
}
