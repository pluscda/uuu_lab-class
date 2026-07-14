import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Partner } from '../../../core/models/partner.model';
import { PartnerService } from '../../../core/services/partner.service';

@Component({
  selector: 'app-partner-detail',
  imports: [ButtonModule],
  templateUrl: './partner-detail.html',
  styleUrl: './partner-detail.scss'
})
export class PartnerDetail implements OnInit {
  private readonly service = inject(PartnerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly partner = signal<Partner | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const pkid = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(pkid).subscribe({
      next: partner => {
        this.partner.set(partner);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入合作廠商失敗' });
        this.router.navigate(['/partners']);
      }
    });
  }

  back(): void {
    this.router.navigate(['/partners']);
  }

  edit(): void {
    const partner = this.partner();
    if (partner) {
      this.router.navigate(['/partners', partner.pkid, 'edit']);
    }
  }
}
