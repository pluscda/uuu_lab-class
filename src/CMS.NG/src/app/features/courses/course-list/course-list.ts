import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TableModule, TablePageEvent } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService, SortEvent } from 'primeng/api';
import { Course, CourseQuery } from '../../../core/models/course.model';
import { CourseService } from '../../../core/services/course.service';
import { LookupService } from '../../../core/services/lookup.service';
import { parseIso, toIso } from '../../../core/utils/date.util';

const FILTERS_KEY = 'course-list-filters';
const SORT_KEY = 'course-list-sort';
const PAGE_KEY = 'course-list-page';

@Component({
  selector: 'app-course-list',
  imports: [
    FormsModule,
    ButtonModule,
    TableModule,
    DrawerModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    TagModule
  ],
  templateUrl: './course-list.html',
  styleUrl: './course-list.scss'
})
export class CourseList implements OnInit {
  private readonly service = inject(CourseService);
  private readonly lookupService = inject(LookupService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly courses = signal<Course[]>([]);
  readonly loading = signal(false);
  readonly filterVisible = signal(false);
  readonly partnerOptions = signal<{ pkid: number; label: string }[]>([]);
  readonly courseGroupOptions = signal<{ pkid: number; label: string }[]>([]);
  readonly publishStatusOptions = signal<{ pkid: number; label: string }[]>([]);

  readonly boolOptions = [
    { label: '全部', value: null },
    { label: '是', value: true },
    { label: '否', value: false }
  ];

  filters: CourseQuery = {};
  // p-datepicker bindings; converted to ISO strings in filters on apply
  scheduleOnFrom: Date | null = null;
  scheduleOnTo: Date | null = null;
  scheduleOffFrom: Date | null = null;
  scheduleOffTo: Date | null = null;

  sortField = 'courseId';
  sortOrder = 1;
  first = 0;
  rows = 20;

  ngOnInit(): void {
    this.restoreState();
    forkJoin({
      partners: this.lookupService.getPartners(),
      courseGroups: this.lookupService.getCourseGroups(),
      publishStatuses: this.lookupService.getPublishStatuses()
    }).subscribe({
      next: ({ partners, courseGroups, publishStatuses }) => {
        this.partnerOptions.set(partners.map(p => ({ pkid: p.pkid, label: p.name })));
        this.courseGroupOptions.set(courseGroups.map(g => ({ pkid: g.pkid, label: g.description })));
        this.publishStatusOptions.set(publishStatuses.map(s => ({ pkid: s.pkid, label: s.description })));
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入下拉選項失敗' });
        this.load();
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.service.query(this.filters).subscribe({
      next: courses => {
        this.courses.set(courses);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入課程失敗' });
      }
    });
  }

  applyFilters(): void {
    this.filters.scheduleOnFrom = this.scheduleOnFrom ? toIso(this.scheduleOnFrom) : null;
    this.filters.scheduleOnTo = this.scheduleOnTo ? toIso(this.scheduleOnTo) : null;
    this.filters.scheduleOffFrom = this.scheduleOffFrom ? toIso(this.scheduleOffFrom) : null;
    this.filters.scheduleOffTo = this.scheduleOffTo ? toIso(this.scheduleOffTo) : null;
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(this.filters));
    this.first = 0;
    this.savePage();
    this.filterVisible.set(false);
    this.load();
  }

  clearFilters(): void {
    this.filters = {};
    this.scheduleOnFrom = null;
    this.scheduleOnTo = null;
    this.scheduleOffFrom = null;
    this.scheduleOffTo = null;
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

  view(course: Course): void {
    this.router.navigate(['/courses', course.pkid]);
  }

  edit(course: Course): void {
    this.router.navigate(['/courses', course.pkid, 'edit']);
  }

  add(): void {
    this.router.navigate(['/courses/new']);
  }

  confirmDelete(course: Course): void {
    this.confirmationService.confirm({
      header: '刪除確認',
      message: `確定要刪除主代碼 <b>${course.pkid}</b>「${course.courseId}」？`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: '刪除', severity: 'danger' },
      rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
      accept: () => this.delete(course)
    });
  }

  private delete(course: Course): void {
    this.service.delete(course.pkid).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '課程已刪除' });
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '刪除課程失敗' });
      }
    });
  }

  private restoreState(): void {
    const filters = sessionStorage.getItem(FILTERS_KEY);
    if (filters) {
      this.filters = JSON.parse(filters);
      this.scheduleOnFrom = this.filters.scheduleOnFrom ? parseIso(this.filters.scheduleOnFrom) : null;
      this.scheduleOnTo = this.filters.scheduleOnTo ? parseIso(this.filters.scheduleOnTo) : null;
      this.scheduleOffFrom = this.filters.scheduleOffFrom ? parseIso(this.filters.scheduleOffFrom) : null;
      this.scheduleOffTo = this.filters.scheduleOffTo ? parseIso(this.filters.scheduleOffTo) : null;
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
