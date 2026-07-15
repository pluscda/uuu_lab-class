import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { AppRole, AppUserLookup } from '../../../core/models/app-role.model';
import { AppRoleService } from '../../../core/services/app-role.service';
import { LookupService } from '../../../core/services/lookup.service';
import { RowAuditBadgeComponent } from '../../../shared/row-audit-badge/row-audit-badge';

@Component({
  selector: 'app-app-role-detail',
  imports: [ButtonModule, TagModule, RowAuditBadgeComponent],
  templateUrl: './app-role-detail.html',
  styleUrl: './app-role-detail.scss'
})
export class AppRoleDetail implements OnInit {
  private readonly service = inject(AppRoleService);
  private readonly lookupService = inject(LookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly role = signal<AppRole | null>(null);
  readonly users = signal<AppUserLookup[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    const roleId = this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      role: this.service.getById(roleId),
      users: this.lookupService.getAppUsers()
    }).subscribe({
      next: ({ role, users }) => {
        this.role.set(role);
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入角色失敗' });
        this.router.navigate(['/app-roles']);
      }
    });
  }

  userLabel(userId: string): string {
    const user = this.users().find(u => u.userId === userId);
    return user ? `${user.userName} (${user.userId})` : userId;
  }

  back(): void {
    this.router.navigate(['/app-roles']);
  }

  edit(): void {
    const role = this.role();
    if (role) {
      this.router.navigate(['/app-roles', role.roleId, 'edit']);
    }
  }
}
