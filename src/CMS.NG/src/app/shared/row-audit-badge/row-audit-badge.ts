import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RowAuditEntry } from '../../core/models/row-audit.model';
import { RowAuditService } from '../../core/services/row-audit.service';

// Reusable toolbar badge showing a record's RowAudit history: the most recent
// change inline, the full trail (newest first, as returned by the API) in a
// dialog. Drop into any detail/form toolbar with the page's tableName + pkid.
@Component({
  selector: 'app-row-audit-badge',
  imports: [DatePipe, DialogModule, TableModule, TagModule],
  templateUrl: './row-audit-badge.html',
  styleUrl: './row-audit-badge.scss'
})
export class RowAuditBadgeComponent implements OnInit {
  private readonly service = inject(RowAuditService);

  readonly tableName = input.required<string>();
  readonly pkid = input.required<number>();

  readonly entries = signal<RowAuditEntry[]>([]);
  readonly loaded = signal(false);
  readonly dialogVisible = signal(false);

  readonly latest = computed(() => this.entries()[0] ?? null);

  ngOnInit(): void {
    this.service.getForRecord(this.tableName(), this.pkid()).subscribe({
      next: entries => {
        this.entries.set(entries);
        this.loaded.set(true);
      },
      // A failed fetch degrades to the "no history" state — the badge is
      // informational and must never break its host page.
      error: () => this.loaded.set(true)
    });
  }

  openDialog(): void {
    this.dialogVisible.set(true);
  }

  actionSeverity(actionType: string): 'success' | 'info' | 'danger' | 'secondary' {
    switch (actionType) {
      case 'Insert': return 'success';
      case 'Update': return 'info';
      case 'Delete': return 'danger';
      default: return 'secondary';
    }
  }
}
