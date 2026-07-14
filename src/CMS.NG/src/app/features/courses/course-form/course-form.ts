import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { CourseRequest } from '../../../core/models/course.model';
import { CourseService } from '../../../core/services/course.service';
import { LookupService } from '../../../core/services/lookup.service';
import { addYears, parseIso, toIso } from '../../../core/utils/date.util';

@Component({
  selector: 'app-course-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
    CheckboxModule
  ],
  templateUrl: './course-form.html',
  styleUrl: './course-form.scss'
})
export class CourseForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CourseService);
  private readonly lookupService = inject(LookupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly partnerOptions = signal<{ pkid: number; label: string }[]>([]);
  readonly courseGroupOptions = signal<{ pkid: number; label: string }[]>([]);
  readonly publishStatusOptions = signal<{ pkid: number; label: string }[]>([]);
  readonly certificationOptions = signal<{ pkid: number; label: string }[]>([]);
  readonly jobCategoryOptions = signal<{ pkid: number; label: string }[]>([]);

  readonly form = this.fb.group({
    pkid: this.fb.nonNullable.control(0),
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    officialTitle: this.fb.control<string | null>(null, [Validators.maxLength(300)]),
    courseId: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    prodCourseId: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    friendlyUrl: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    displayOrder: this.fb.nonNullable.control(0, [Validators.required]),
    partnerPkid: this.fb.control<number | null>(null, [Validators.required]),
    courseGroupPkid: this.fb.control<number | null>(null),
    publishStatusPkid: this.fb.control<number | null>(null, [Validators.required]),
    scheduleOn: this.fb.control<Date | null>(null, [Validators.required]),
    scheduleOff: this.fb.control<Date | null>(null, [Validators.required]),
    hour: this.fb.nonNullable.control(0, [Validators.required]),
    listPrice: this.fb.nonNullable.control(0, [Validators.required]),
    learningCredit: this.fb.nonNullable.control(0, [Validators.required]),
    material: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    objective: this.fb.control<string | null>(null, [Validators.maxLength(4000)]),
    target: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    prerequisites: this.fb.control<string | null>(null, [Validators.maxLength(4000)]),
    outline: this.fb.control<string | null>(null),
    towardCertOrExam: this.fb.control<string | null>(null),
    note: this.fb.control<string | null>(null, [Validators.maxLength(4000)]),
    otherInfo: this.fb.control<string | null>(null, [Validators.maxLength(4000)]),
    canRepeat: this.fb.nonNullable.control(false),
    certificationPkids: this.fb.nonNullable.control<number[]>([]),
    jobCategoryPkids: this.fb.nonNullable.control<number[]>([])
  });

  ngOnInit(): void {
    // Auto-default: ScheduleOff = ScheduleOn + 10 years (loaded values win in edit
    // mode because scheduleOff is patched after scheduleOn).
    this.form.controls.scheduleOn.valueChanges.subscribe(value => {
      if (value instanceof Date) {
        this.form.controls.scheduleOff.setValue(addYears(value, 10), { emitEvent: false });
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!id);

    const lookups$ = {
      partners: this.lookupService.getPartners(),
      courseGroups: this.lookupService.getCourseGroups(),
      publishStatuses: this.lookupService.getPublishStatuses(),
      certifications: this.lookupService.getCertifications(),
      jobCategories: this.lookupService.getJobCategories()
    };

    if (id) {
      forkJoin({ ...lookups$, course: this.service.getById(Number(id)) }).subscribe({
        next: result => {
          this.setOptions(result);
          const course = result.course;
          this.form.patchValue({
            pkid: course.pkid,
            title: course.title,
            officialTitle: course.officialTitle,
            courseId: course.courseId,
            prodCourseId: course.prodCourseId,
            friendlyUrl: course.friendlyUrl,
            displayOrder: course.displayOrder,
            partnerPkid: course.partnerPkid,
            courseGroupPkid: course.courseGroupPkid,
            publishStatusPkid: course.publishStatusPkid,
            scheduleOn: parseIso(course.scheduleOn),
            scheduleOff: parseIso(course.scheduleOff),
            hour: course.hour,
            listPrice: course.listPrice,
            learningCredit: course.learningCredit,
            material: course.material,
            objective: course.objective,
            target: course.target,
            prerequisites: course.prerequisites,
            outline: course.outline,
            towardCertOrExam: course.towardCertOrExam,
            note: course.note,
            otherInfo: course.otherInfo,
            canRepeat: course.canRepeat,
            certificationPkids: course.certificationPkids,
            jobCategoryPkids: course.jobCategoryPkids
          });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入課程失敗' });
          this.router.navigate(['/courses']);
        }
      });
    } else {
      forkJoin(lookups$).subscribe({
        next: result => this.setOptions(result),
        error: () => {
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入下拉選項失敗' });
        }
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request = {
      ...raw,
      scheduleOn: toIso(raw.scheduleOn as Date),
      scheduleOff: toIso(raw.scheduleOff as Date)
    } as unknown as CourseRequest;
    this.saving.set(true);

    const action$: Observable<unknown> = this.isEdit()
      ? this.service.update(request)
      : this.service.create(request);

    action$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '課程已儲存' });
        this.router.navigate(['/courses']);
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '儲存課程失敗' });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/courses']);
  }

  private setOptions(result: {
    partners: { pkid: number; name: string }[];
    courseGroups: { pkid: number; description: string }[];
    publishStatuses: { pkid: number; description: string }[];
    certifications: { pkid: number; title: string | null }[];
    jobCategories: { pkid: number; description: string }[];
  }): void {
    this.partnerOptions.set(result.partners.map(p => ({ pkid: p.pkid, label: p.name })));
    this.courseGroupOptions.set(result.courseGroups.map(g => ({ pkid: g.pkid, label: g.description })));
    this.publishStatusOptions.set(result.publishStatuses.map(s => ({ pkid: s.pkid, label: s.description })));
    this.certificationOptions.set(
      result.certifications.map(c => ({ pkid: c.pkid, label: c.title ?? String(c.pkid) }))
    );
    this.jobCategoryOptions.set(result.jobCategories.map(j => ({ pkid: j.pkid, label: j.description })));
  }
}
