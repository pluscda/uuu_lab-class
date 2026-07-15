import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { CourseGroup } from '../../../core/models/course-group.model';
import { CourseGroupService } from '../../../core/services/course-group.service';
import { RowAuditBadgeComponent } from '../../../shared/row-audit-badge/row-audit-badge';

@Component({
  selector: 'app-course-group-detail',
  imports: [ButtonModule, RowAuditBadgeComponent],
  templateUrl: './course-group-detail.html',
  styleUrl: './course-group-detail.scss'
})
export class CourseGroupDetail implements OnInit {
  private readonly service = inject(CourseGroupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly group = signal<CourseGroup | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const pkid = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(pkid).subscribe({
      next: group => {
        this.group.set(group);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入課程群組失敗' });
        this.router.navigate(['/course-groups']);
      }
    });
  }

  back(): void {
    this.router.navigate(['/course-groups']);
  }

  edit(): void {
    const group = this.group();
    if (group) {
      this.router.navigate(['/course-groups', group.pkid, 'edit']);
    }
  }
}
