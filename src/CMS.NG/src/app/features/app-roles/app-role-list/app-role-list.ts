import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule, TablePageEvent } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService, MessageService, SortEvent } from 'primeng/api';
import { AppRole, AppRoleQuery } from '../../../core/models/app-role.model';
import { AppRoleService } from '../../../core/services/app-role.service';

const FILTERS_KEY = 'app-role-list-filters';
const SORT_KEY = 'app-role-list-sort';
const PAGE_KEY = 'app-role-list-page';

@Component({
  selector: 'app-app-role-list',
  imports: [
    FormsModule,
    ButtonModule,
    TableModule,
    DrawerModule,
    InputTextModule,
    InputNumberModule
  ],
  templateUrl: './app-role-list.html',
  styleUrl: './app-role-list.scss'
})
export class AppRoleList implements OnInit {
  private readonly service = inject(AppRoleService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly roles = signal<AppRole[]>([]);
  readonly loading = signal(false);
  readonly filterVisible = signal(false);

  filters: AppRoleQuery = {};
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
      next: roles => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入角色失敗' });
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

  view(role: AppRole): void {
    this.router.navigate(['/app-roles', role.roleId]);
  }

  edit(role: AppRole): void {
    this.router.navigate(['/app-roles', role.roleId, 'edit']);
  }

  add(): void {
    this.router.navigate(['/app-roles/new']);
  }

  confirmDelete(role: AppRole): void {
    this.confirmationService.confirm({
      header: '刪除確認',
      message: `確定要刪除主代碼 <b>${role.pkid}</b>「${role.roleId}」？`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: '刪除', severity: 'danger' },
      rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
      accept: () => this.delete(role)
    });
  }

  private delete(role: AppRole): void {
    this.service.delete(role.roleId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '角色已刪除' });
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '刪除角色失敗' });
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
