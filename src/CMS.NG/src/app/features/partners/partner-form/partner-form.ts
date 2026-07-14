import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { PartnerRequest } from '../../../core/models/partner.model';
import { PartnerService } from '../../../core/services/partner.service';

@Component({
  selector: 'app-partner-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, InputNumberModule],
  templateUrl: './partner-form.html',
  styleUrl: './partner-form.scss'
})
export class PartnerForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PartnerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly isEdit = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    pkid: this.fb.nonNullable.control(0),
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    appKey: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(10)]),
    nameOnPartnerMenu: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(200)
    ]),
    nameOnCourseDetailPage: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(50)
    ]),
    displayOrder: this.fb.nonNullable.control(0, [Validators.required]),
    imageFilename: this.fb.control<string | null>(null, [Validators.maxLength(50)])
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit.set(!!id);

    if (id) {
      this.service.getById(Number(id)).subscribe({
        next: partner => {
          this.form.patchValue({
            pkid: partner.pkid,
            name: partner.name,
            appKey: partner.appKey,
            nameOnPartnerMenu: partner.nameOnPartnerMenu,
            nameOnCourseDetailPage: partner.nameOnCourseDetailPage,
            displayOrder: partner.displayOrder,
            imageFilename: partner.imageFilename
          });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入合作廠商失敗' });
          this.router.navigate(['/partners']);
        }
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue() as PartnerRequest;
    this.saving.set(true);

    const action$: Observable<unknown> = this.isEdit()
      ? this.service.update(request)
      : this.service.create(request);

    action$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '合作廠商已儲存' });
        this.router.navigate(['/partners']);
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '儲存合作廠商失敗' });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/partners']);
  }
}
