import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { PublishStatusRequest } from '../../../core/models/publish-status.model';
import { PublishStatusService } from '../../../core/services/publish-status.service';
import { RowAuditBadgeComponent } from '../../../shared/row-audit-badge/row-audit-badge';

@Component({
  selector: 'app-publish-status-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    RowAuditBadgeComponent
  ],
  templateUrl: './publish-status-form.html',
  styleUrl: './publish-status-form.scss'
})
export class PublishStatusForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PublishStatusService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  // Set only in edit mode — the audit badge needs the existing record's pkid.
  readonly pkid = signal<number | null>(null);

  readonly form = this.fb.group({
    pkid: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(255)
    ]),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    isDraft: this.fb.nonNullable.control(false),
    isPublished: this.fb.nonNullable.control(false),
    isDiscontinued: this.fb.nonNullable.control(false)
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!id);

    if (id) {
      this.pkid.set(Number(id));
      this.form.controls.pkid.disable();
      this.service.getById(Number(id)).subscribe({
        next: status => {
          this.form.patchValue({
            pkid: status.pkid,
            description: status.description,
            isDraft: status.isDraft,
            isPublished: status.isPublished,
            isDiscontinued: status.isDiscontinued
          });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入發布狀態失敗' });
          this.router.navigate(['/publish-statuses']);
        }
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue() as PublishStatusRequest;
    this.saving.set(true);

    const action$: Observable<unknown> = this.isEdit()
      ? this.service.update(request)
      : this.service.create(request);

    action$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '發布狀態已儲存' });
        this.router.navigate(['/publish-statuses']);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const detail = err.status === 409 ? '主代碼已存在' : '儲存發布狀態失敗';
        this.messageService.add({ severity: 'error', summary: '錯誤', detail });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/publish-statuses']);
  }
}
