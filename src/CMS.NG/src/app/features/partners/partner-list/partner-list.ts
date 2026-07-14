import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule, TablePageEvent } from 'primeng/table';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService, MessageService, SortEvent } from 'primeng/api';
import { Partner, PartnerQuery } from '../../../core/models/partner.model';
import { PartnerService } from '../../../core/services/partner.service';

const FILTERS_KEY = 'partner-list-filters';
const SORT_KEY = 'partner-list-sort';
const PAGE_KEY = 'partner-list-page';

@Component({
  selector: 'app-partner-list',
  imports: [FormsModule, ButtonModule, TableModule, DrawerModule, InputTextModule],
  templateUrl: './partner-list.html',
  styleUrl: './partner-list.scss'
})
export class PartnerList implements OnInit {
  private readonly service = inject(PartnerService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly partners = signal<Partner[]>([]);
  readonly loading = signal(false);
  readonly filterVisible = signal(false);

  filters: PartnerQuery = {};
  sortField = 'displayOrder';
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
      next: partners => {
        this.partners.set(partners);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入合作廠商失敗' });
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

  view(partner: Partner): void {
    this.router.navigate(['/partners', partner.pkid]);
  }

  edit(partner: Partner): void {
    this.router.navigate(['/partners', partner.pkid, 'edit']);
  }

  add(): void {
    this.router.navigate(['/partners/new']);
  }

  confirmDelete(partner: Partner): void {
    this.confirmationService.confirm({
      header: '刪除確認',
      message: `確定要刪除主代碼 <b>${partner.pkid}</b>「${partner.name}」？`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: '刪除', severity: 'danger' },
      rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
      accept: () => this.delete(partner)
    });
  }

  private delete(partner: Partner): void {
    this.service.delete(partner.pkid).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '合作廠商已刪除' });
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '刪除合作廠商失敗' });
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
