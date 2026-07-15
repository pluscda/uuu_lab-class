import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TableModule, TablePageEvent } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService, SortEvent } from 'primeng/api';
import { Course, CourseQuery, CourseRequest } from '../../../core/models/course.model';
import { CourseService } from '../../../core/services/course.service';
import { LookupService } from '../../../core/services/lookup.service';
import { parseIso, toIso } from '../../../core/utils/date.util';

export type EditableCourseField =
  | 'displayOrder'
  | 'courseId'
  | 'prodCourseId'
  | 'title'
  | 'publishStatusPkid'
  | 'scheduleOn'
  | 'scheduleOff'
  | 'hour'
  | 'listPrice'
  | 'learningCredit'
  | 'canRepeat';

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
    CheckboxModule,
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
  private readonly host = inject(ElementRef<HTMLElement>);

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

  // In-place cell editing (double-click a cell; read-only: pkid, partnerName, courseGroupDescription)
  readonly editingPkid = signal<number | null>(null);
  readonly editingField = signal<EditableCourseField | null>(null);
  readonly editError = signal<string | null>(null);
  readonly editSaving = signal(false);
  editValue: any = null;

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

  startEdit(course: Course, field: EditableCourseField): void {
    if (this.editSaving()) {
      return;
    }
    this.editingPkid.set(course.pkid);
    this.editingField.set(field);
    this.editError.set(null);
    this.editValue =
      field === 'scheduleOn' || field === 'scheduleOff'
        ? course[field]
          ? parseIso(course[field])
          : null
        : course[field];
    setTimeout(() => {
      const el = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(
        'input.cell-editor, .cell-editor input'
      );
      el?.focus();
    });
  }

  isEditing(course: Course, field: EditableCourseField): boolean {
    return this.editingPkid() === course.pkid && this.editingField() === field;
  }

  cancelEdit(): void {
    this.editingPkid.set(null);
    this.editingField.set(null);
    this.editError.set(null);
    this.editValue = null;
  }

  // Datepicker blur fires before a panel click's onSelect; defer so onSelect's
  // commit (which sets editSaving) wins and the stale blur is skipped.
  onDateEditorBlur(course: Course): void {
    const pkid = this.editingPkid();
    const field = this.editingField();
    setTimeout(() => {
      if (this.editingPkid() === pkid && this.editingField() === field && !this.editSaving()) {
        this.commitEdit(course);
      }
    }, 150);
  }

  commitEdit(course: Course): void {
    const field = this.editingField();
    if (field === null || this.editingPkid() !== course.pkid || this.editSaving()) {
      return;
    }

    const error = this.validateEdit(field, this.editValue, course);
    if (error) {
      this.editError.set(error);
      return;
    }

    const value =
      field === 'scheduleOn' || field === 'scheduleOff' ? toIso(this.editValue as Date) : this.editValue;
    if (value === course[field]) {
      this.cancelEdit();
      return;
    }

    this.editSaving.set(true);
    // PUT rebuilds N-N links (delete-then-reinsert) and the list rows carry
    // empty ID lists, so fetch the full entity before sending the update.
    this.service
      .getById(course.pkid)
      .pipe(switchMap(full => this.service.update(this.buildRequest(full, field, value))))
      .subscribe({
        next: () => {
          this.applyEdit(course.pkid, field, value);
          this.editSaving.set(false);
          this.cancelEdit();
          this.messageService.add({ severity: 'success', summary: '成功', detail: '課程已更新' });
        },
        error: () => {
          // Row was never mutated, so exiting edit mode reverts to the previous value.
          this.editSaving.set(false);
          this.cancelEdit();
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '更新課程失敗，已還原原值' });
        }
      });
  }

  private validateEdit(field: EditableCourseField, value: any, course: Course): string | null {
    switch (field) {
      case 'title':
        return this.requiredText(value, 200);
      case 'courseId':
      case 'prodCourseId':
        return this.requiredText(value, 50);
      case 'displayOrder':
        return typeof value === 'number' && Number.isFinite(value) ? null : '必須為有效數字';
      case 'hour':
      case 'listPrice':
      case 'learningCredit':
        return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? null : '必須為非負數字';
      case 'publishStatusPkid':
        return value != null ? null : '此欄位為必填';
      case 'scheduleOn':
        if (!(value instanceof Date) || isNaN(value.getTime())) {
          return '請輸入有效日期';
        }
        return toIso(value) <= course.scheduleOff ? null : '上架日期不可晚於下架日期';
      case 'scheduleOff':
        if (!(value instanceof Date) || isNaN(value.getTime())) {
          return '請輸入有效日期';
        }
        return course.scheduleOn <= toIso(value) ? null : '上架日期不可晚於下架日期';
      case 'canRepeat':
        return null;
    }
  }

  private requiredText(value: any, maxLength: number): string | null {
    if (typeof value !== 'string' || !value.trim()) {
      return '此欄位為必填';
    }
    return value.length > maxLength ? `長度不可超過 ${maxLength} 字` : null;
  }

  private buildRequest(full: Course, field: EditableCourseField, value: unknown): CourseRequest {
    const request: CourseRequest = {
      pkid: full.pkid,
      title: full.title,
      officialTitle: full.officialTitle,
      courseId: full.courseId,
      prodCourseId: full.prodCourseId,
      friendlyUrl: full.friendlyUrl,
      displayOrder: full.displayOrder,
      partnerPkid: full.partnerPkid,
      courseGroupPkid: full.courseGroupPkid,
      publishStatusPkid: full.publishStatusPkid,
      scheduleOn: full.scheduleOn,
      scheduleOff: full.scheduleOff,
      hour: full.hour,
      listPrice: full.listPrice,
      learningCredit: full.learningCredit,
      material: full.material,
      objective: full.objective,
      target: full.target,
      prerequisites: full.prerequisites,
      outline: full.outline,
      towardCertOrExam: full.towardCertOrExam,
      note: full.note,
      otherInfo: full.otherInfo,
      canRepeat: full.canRepeat,
      certificationPkids: full.certificationPkids,
      jobCategoryPkids: full.jobCategoryPkids
    };
    return { ...request, [field]: value } as CourseRequest;
  }

  private applyEdit(pkid: number, field: EditableCourseField, value: unknown): void {
    this.courses.update(list =>
      list.map(c => {
        if (c.pkid !== pkid) {
          return c;
        }
        const updated = { ...c, [field]: value } as Course;
        if (field === 'publishStatusPkid') {
          updated.publishStatusDescription =
            this.publishStatusOptions().find(o => o.pkid === value)?.label ?? updated.publishStatusDescription;
        }
        return updated;
      })
    );
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
