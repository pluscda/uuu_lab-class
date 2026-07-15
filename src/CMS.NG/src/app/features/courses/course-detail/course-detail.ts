import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { CertificationLookup, Course, JobCategoryLookup } from '../../../core/models/course.model';
import { CourseService } from '../../../core/services/course.service';
import { LookupService } from '../../../core/services/lookup.service';
import { QrCodeService } from '../../../core/services/qr-code.service';
import { RowAuditBadgeComponent } from '../../../shared/row-audit-badge/row-audit-badge';

const COURSE_SHOW_URL_BASE = 'https://www.uuu.com.tw/Course/Show';

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, ButtonModule, TagModule, RowAuditBadgeComponent],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss'
})
export class CourseDetail implements OnInit {
  private readonly service = inject(CourseService);
  private readonly lookupService = inject(LookupService);
  private readonly qrCodeService = inject(QrCodeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly course = signal<Course | null>(null);
  readonly certifications = signal<CertificationLookup[]>([]);
  readonly jobCategories = signal<JobCategoryLookup[]>([]);
  readonly loading = signal(true);
  readonly qrCodeDataUrl = signal<string | null>(null);

  ngOnInit(): void {
    const pkid = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      course: this.service.getById(pkid),
      certifications: this.lookupService.getCertifications(),
      jobCategories: this.lookupService.getJobCategories()
    }).subscribe({
      next: ({ course, certifications, jobCategories }) => {
        this.course.set(course);
        this.certifications.set(certifications);
        this.jobCategories.set(jobCategories);
        this.loading.set(false);
        this.generateQrCode(course);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入課程失敗' });
        this.router.navigate(['/courses']);
      }
    });
  }

  certificationLabel(pkid: number): string {
    const certification = this.certifications().find(c => c.pkid === pkid);
    return certification?.title ?? String(pkid);
  }

  jobCategoryLabel(pkid: number): string {
    const jobCategory = this.jobCategories().find(j => j.pkid === pkid);
    return jobCategory?.description ?? String(pkid);
  }

  courseShowUrl(course: Course): string {
    return `${COURSE_SHOW_URL_BASE}/${course.pkid}/${encodeURIComponent(course.courseId)}`;
  }

  downloadQrCode(): void {
    const course = this.course();
    const dataUrl = this.qrCodeDataUrl();
    if (!course || !dataUrl) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `${course.courseId}.png`;
    anchor.click();
  }

  private generateQrCode(course: Course): void {
    this.qrCodeService.toDataUrl(this.courseShowUrl(course)).then(
      dataUrl => this.qrCodeDataUrl.set(dataUrl),
      () => this.qrCodeDataUrl.set(null)
    );
  }

  back(): void {
    this.router.navigate(['/courses']);
  }

  edit(): void {
    const course = this.course();
    if (course) {
      this.router.navigate(['/courses', course.pkid, 'edit']);
    }
  }
}
