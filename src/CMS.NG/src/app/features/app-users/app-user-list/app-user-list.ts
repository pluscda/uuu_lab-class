import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule, TablePageEvent } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService, SortEvent } from 'primeng/api';
import { AppUser, AppUserQuery } from '../../../core/models/app-user.model';
import { AppUserService } from '../../../core/services/app-user.service';
import { parseIso, toIso } from '../../../core/utils/date.util';

const FILTERS_KEY = 'app-user-list-filters';
const SORT_KEY = 'app-user-list-sort';
const PAGE_KEY = 'app-user-list-page';

@Component({
  selector: 'app-app-user-list',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    TableModule,
    DrawerModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    TagModule
  ],
  templateUrl: './app-user-list.html',
  styleUrl: './app-user-list.scss'
})
export class AppUserList implements OnInit {
  private readonly service = inject(AppUserService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly users = signal<AppUser[]>([]);
  readonly loading = signal(false);
  readonly filterVisible = signal(false);

  readonly activeOptions = [
    { label: '全部', value: null },
    { label: '啟用', value: true },
    { label: '停用', value: false }
  ];

  filters: AppUserQuery = {};
  // p-datepicker bindings; converted to ISO strings in filters on apply
  passwordUpdatedTimeFrom: Date | null = null;
  passwordUpdatedTimeTo: Date | null = null;

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
      next: users => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入使用者失敗' });
      }
    });
  }

  applyFilters(): void {
    this.filters.passwordUpdatedTimeFrom = this.passwordUpdatedTimeFrom
      ? toIso(this.passwordUpdatedTimeFrom)
      : null;
    this.filters.passwordUpdatedTimeTo = this.passwordUpdatedTimeTo
      ? toIso(this.passwordUpdatedTimeTo)
      : null;
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(this.filters));
    this.first = 0;
    this.savePage();
    this.filterVisible.set(false);
    this.load();
  }

  clearFilters(): void {
    this.filters = {};
    this.passwordUpdatedTimeFrom = null;
    this.passwordUpdatedTimeTo = null;
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

  view(user: AppUser): void {
    this.router.navigate(['/app-users', user.userId]);
  }

  edit(user: AppUser): void {
    this.router.navigate(['/app-users', user.userId, 'edit']);
  }

  add(): void {
    this.router.navigate(['/app-users/new']);
  }

  confirmDelete(user: AppUser): void {
    this.confirmationService.confirm({
      header: '刪除確認',
      message: `確定要刪除主代碼 <b>${user.pkid}</b>「${user.userId}」？`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: '刪除', severity: 'danger' },
      rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
      accept: () => this.delete(user)
    });
  }

  private delete(user: AppUser): void {
    this.service.delete(user.userId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '使用者已刪除' });
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '刪除使用者失敗' });
      }
    });
  }

  private restoreState(): void {
    const filters = sessionStorage.getItem(FILTERS_KEY);
    if (filters) {
      this.filters = JSON.parse(filters);
      this.passwordUpdatedTimeFrom = this.filters.passwordUpdatedTimeFrom
        ? parseIso(this.filters.passwordUpdatedTimeFrom)
        : null;
      this.passwordUpdatedTimeTo = this.filters.passwordUpdatedTimeTo
        ? parseIso(this.filters.passwordUpdatedTimeTo)
        : null;
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
