import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Course } from '../../../core/models/course.model';
import { CourseService } from '../../../core/services/course.service';
import { QrCodeService } from '../../../core/services/qr-code.service';
import { courseShowUrl } from '../../../core/utils/course-url.util';

const FLYER_QR_WIDTH = 300;

@Component({
  selector: 'app-course-flyer',
  imports: [ButtonModule, DecimalPipe],
  templateUrl: './course-flyer.html',
  styleUrl: './course-flyer.scss'
})
export class CourseFlyer implements OnInit, OnDestroy {
  private readonly service = inject(CourseService);
  private readonly qrCodeService = inject(QrCodeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  private readonly previousTitle = document.title;

  readonly course = signal<Course | null>(null);
  readonly loading = signal(true);
  readonly qrCodeUrl = signal<string | null>(null);
  readonly qrCodeDataUrl = signal<string | null>(null);
  readonly outlineClamped = signal(false);

  readonly outlineValue = viewChild<ElementRef<HTMLElement>>('outlineValue');

  ngOnInit(): void {
    document.body.classList.add('course-flyer-active');

    const pkid = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(pkid).subscribe({
      next: course => {
        this.course.set(course);
        this.loading.set(false);
        document.title = `${course.courseId} 課程傳單`;
        this.generateQrCode(course);
        afterNextRender(() => this.checkOutlineClamp(), { injector: this.injector });
      },
      error: () => this.loading.set(false)
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('course-flyer-active');
    document.title = this.previousTitle;
  }

  back(): void {
    const course = this.course();
    this.router.navigate(course ? ['/courses', course.pkid] : ['/courses']);
  }

  print(): void {
    window.print();
  }

  private generateQrCode(course: Course): void {
    const url = courseShowUrl(course);
    this.qrCodeUrl.set(url);
    this.qrCodeService.toDataUrl(url, FLYER_QR_WIDTH).then(
      dataUrl => this.qrCodeDataUrl.set(dataUrl),
      () => this.qrCodeDataUrl.set(null)
    );
  }

  private checkOutlineClamp(): void {
    const el = this.outlineValue()?.nativeElement;
    if (el) {
      this.outlineClamped.set(el.scrollHeight > el.clientHeight);
    }
  }
}
