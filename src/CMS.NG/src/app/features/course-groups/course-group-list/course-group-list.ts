import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule, TablePageEvent } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService, MessageService, SortEvent } from 'primeng/api';
import { CourseGroup, CourseGroupQuery } from '../../../core/models/course-group.model';
import { CourseGroupService } from '../../../core/services/course-group.service';

const FILTERS_KEY = 'course-group-list-filters';
const SORT_KEY = 'course-group-list-sort';
const PAGE_KEY = 'course-group-list-page';

@Component({
  selector: 'app-course-group-list',
  imports: [FormsModule, ButtonModule, TableModule, DrawerModule, InputTextModule],
  templateUrl: './course-group-list.html',
  styleUrl: './course-group-list.scss'
})
export class CourseGroupList implements OnInit {
  private readonly service = inject(CourseGroupService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly groups = signal<CourseGroup[]>([]);
  readonly loading = signal(false);
  readonly filterVisible = signal(false);

  filters: CourseGroupQuery = {};
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
      next: groups => {
        this.groups.set(groups);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入課程群組失敗' });
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

  view(group: CourseGroup): void {
    this.router.navigate(['/course-groups', group.pkid]);
  }

  edit(group: CourseGroup): void {
    this.router.navigate(['/course-groups', group.pkid, 'edit']);
  }

  add(): void {
    this.router.navigate(['/course-groups/new']);
  }

  confirmDelete(group: CourseGroup): void {
    this.confirmationService.confirm({
      header: '刪除確認',
      message: `確定要刪除主代碼 <b>${group.pkid}</b>「${group.description}」？`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: '刪除', severity: 'danger' },
      rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
      accept: () => this.delete(group)
    });
  }

  private delete(group: CourseGroup): void {
    this.service.delete(group.pkid).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '課程群組已刪除' });
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '刪除課程群組失敗' });
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
