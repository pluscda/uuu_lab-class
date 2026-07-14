import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule, TablePageEvent } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService, SortEvent } from 'primeng/api';
import { PublishStatus, PublishStatusQuery } from '../../../core/models/publish-status.model';
import { PublishStatusService } from '../../../core/services/publish-status.service';

const FILTERS_KEY = 'publish-status-list-filters';
const SORT_KEY = 'publish-status-list-sort';
const PAGE_KEY = 'publish-status-list-page';

@Component({
  selector: 'app-publish-status-list',
  imports: [
    FormsModule,
    ButtonModule,
    TableModule,
    DrawerModule,
    InputTextModule,
    SelectModule,
    TagModule
  ],
  templateUrl: './publish-status-list.html',
  styleUrl: './publish-status-list.scss'
})
export class PublishStatusList implements OnInit {
  private readonly service = inject(PublishStatusService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly statuses = signal<PublishStatus[]>([]);
  readonly loading = signal(false);
  readonly filterVisible = signal(false);

  readonly boolOptions = [
    { label: '全部', value: null },
    { label: '是', value: true },
    { label: '否', value: false }
  ];

  filters: PublishStatusQuery = {};
  sortField = 'pkid';
  sortOrder = 1;
  first = 0;
  rows = 20;

  ngOnInit(): void {
    this.restoreState();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.query(this.filters).subscribe({
      next: statuses => {
        this.statuses.set(statuses);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入發布狀態失敗' });
      }
    });
  }

  applyFilters(): void {
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(this.filters));
    this.first = 0;
    this.savePage();
    this.filterVisible.set(false);
    this.load();
  }

  clearFilters(): void {
    this.filters = {};
    sessionStorage.removeItem(FILTERS_KEY);
    this.first = 0;
    this.savePage();
    this.load();
  }

  onSort(event: SortEvent): void {
    sessionStorage.setItem(
      SORT_KEY,
      JSON.stringify({ sortField: event.field, sortOrder: event.order })
    );
  }

  onPage(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
    this.savePage();
  }

  view(status: PublishStatus): void {
    this.router.navigate(['/publish-statuses', status.pkid]);
  }

  edit(status: PublishStatus): void {
    this.router.navigate(['/publish-statuses', status.pkid, 'edit']);
  }

  add(): void {
    this.router.navigate(['/publish-statuses/new']);
  }

  confirmDelete(status: PublishStatus): void {
    this.confirmationService.confirm({
      header: '刪除確認',
      message: `確定要刪除主代碼 <b>${status.pkid}</b>「${status.description}」？`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: '刪除', severity: 'danger' },
      rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
      accept: () => this.delete(status)
    });
  }

  private delete(status: PublishStatus): void {
    this.service.delete(status.pkid).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '發布狀態已刪除' });
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '刪除發布狀態失敗' });
      }
    });
  }

  private restoreState(): void {
    const filters = sessionStorage.getItem(FILTERS_KEY);
    if (filters) {
      this.filters = JSON.parse(filters);
    }
    const sort = sessionStorage.getItem(SORT_KEY);
    if (sort) {
      const { sortField, sortOrder } = JSON.parse(sort);
      this.sortField = sortField;
      this.sortOrder = sortOrder;
    }
    const page = sessionStorage.getItem(PAGE_KEY);
    if (page) {
      const { first, rows } = JSON.parse(page);
      this.first = first;
      this.rows = rows;
    }
  }

  private savePage(): void {
    sessionStorage.setItem(PAGE_KEY, JSON.stringify({ first: this.first, rows: this.rows }));
  }
}
