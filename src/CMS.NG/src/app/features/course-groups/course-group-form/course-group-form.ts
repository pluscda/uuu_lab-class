import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { CourseGroupRequest } from '../../../core/models/course-group.model';
import { CourseGroupService } from '../../../core/services/course-group.service';

@Component({
  selector: 'app-course-group-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule],
  templateUrl: './course-group-form.html',
  styleUrl: './course-group-form.scss'
})
export class CourseGroupForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CourseGroupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    pkid: this.fb.nonNullable.control(0),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)])
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!id);

    if (id) {
      this.service.getById(Number(id)).subscribe({
        next: group => {
          this.form.patchValue({
            pkid: group.pkid,
            description: group.description
          });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入課程群組失敗' });
          this.router.navigate(['/course-groups']);
        }
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue() as CourseGroupRequest;
    this.saving.set(true);

    const action$: Observable<unknown> = this.isEdit()
      ? this.service.update(request)
      : this.service.create(request);

    action$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '課程群組已儲存' });
        this.router.navigate(['/course-groups']);
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '儲存課程群組失敗' });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/course-groups']);
  }
}
