import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { PublishStatus } from '../../../core/models/publish-status.model';
import { PublishStatusService } from '../../../core/services/publish-status.service';
import { RowAuditBadgeComponent } from '../../../shared/row-audit-badge/row-audit-badge';

@Component({
  selector: 'app-publish-status-detail',
  imports: [ButtonModule, TagModule, RowAuditBadgeComponent],
  templateUrl: './publish-status-detail.html',
  styleUrl: './publish-status-detail.scss'
})
export class PublishStatusDetail implements OnInit {
  private readonly service = inject(PublishStatusService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly status = signal<PublishStatus | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const pkid = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(pkid).subscribe({
      next: status => {
        this.status.set(status);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入發布狀態失敗' });
        this.router.navigate(['/publish-statuses']);
      }
    });
  }

  back(): void {
    this.router.navigate(['/publish-statuses']);
  }

  edit(): void {
    const status = this.status();
    if (status) {
      this.router.navigate(['/publish-statuses', status.pkid, 'edit']);
    }
  }
}
