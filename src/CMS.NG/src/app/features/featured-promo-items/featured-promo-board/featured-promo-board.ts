import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  FeaturedPromoItem,
  FeaturedPromoItemQuery,
  FeaturedPromoItemRequest,
  PromotionLookup,
  TrainingCenterLookup
} from '../../../core/models/featured-promo-item.model';
import { FeaturedPromoItemService } from '../../../core/services/featured-promo-item.service';
import { LookupService } from '../../../core/services/lookup.service';
import { addDays, startOfWeek, toIso } from '../../../core/utils/date.util';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface BoardDay {
  iso: string;
  label: string;
}

interface PromoClipboard {
  promotionPkid: number;
  promoCode: string;
  topic: string;
  description: string;
}

@Component({
  selector: 'app-featured-promo-board',
  imports: [ReactiveFormsModule, ButtonModule, TabsModule, InputTextModule, AutoCompleteModule],
  templateUrl: './featured-promo-board.html',
  styleUrl: './featured-promo-board.scss'
})
export class FeaturedPromoBoard implements OnInit {
  private readonly service = inject(FeaturedPromoItemService);
  private readonly lookupService = inject(LookupService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  readonly trainingCenters = signal<TrainingCenterLookup[]>([]);
  readonly items = signal<FeaturedPromoItem[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly selectedCenter = signal<number | null>(null);
  readonly weekStart = signal<Date>(startOfWeek(new Date()));
  readonly promoSuggestions = signal<PromotionLookup[]>([]);
  readonly clipboard = signal<PromoClipboard | null>(null);
  // `${scheduleOn}|${slot}` of the cell being edited; null pkid = create
  readonly editingKey = signal<string | null>(null);
  private editingPkid: number | null = null;

  readonly slots = [1, 2, 3];

  readonly days = computed<BoardDay[]>(() => {
    const start = this.weekStart();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        iso: toIso(date),
        label: `${date.getMonth() + 1}/${date.getDate()} (${WEEKDAY_LABELS[i]})`
      };
    });
  });

  readonly weekLabel = computed(() => {
    const start = this.weekStart();
    const end = addDays(start, 6);
    return `${start.getMonth() + 1}/${start.getDate()} -- ${end.getMonth() + 1}/${end.getDate()}`;
  });

  private readonly itemMap = computed(() => {
    const map = new Map<string, FeaturedPromoItem>();
    for (const item of this.items()) {
      map.set(`${item.scheduleOn}|${item.slot}`, item);
    }
    return map;
  });

  readonly form = this.fb.group({
    promo: this.fb.control<PromotionLookup | string | null>(null, Validators.required),
    topic: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(300)])
  });

  ngOnInit(): void {
    this.lookupService.getTrainingCenters().subscribe({
      next: centers => {
        this.trainingCenters.set(centers);
        if (centers.length > 0) {
          this.selectedCenter.set(centers[0].pkid);
        }
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入訓練中心失敗' });
      }
    });
  }

  load(): void {
    this.loading.set(true);
    const query: FeaturedPromoItemQuery = {
      scheduleOnFrom: toIso(this.weekStart()),
      scheduleOnTo: toIso(addDays(this.weekStart(), 6)),
      trainingCenterPkid: this.selectedCenter()
    };
    this.service.query(query).subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '載入促銷上稿失敗' });
      }
    });
  }

  itemAt(iso: string, slot: number): FeaturedPromoItem | undefined {
    return this.itemMap().get(`${iso}|${slot}`);
  }

  selectCenter(pkid: string | number | undefined): void {
    const value = Number(pkid);
    if (!value || value === this.selectedCenter()) {
      return;
    }
    this.selectedCenter.set(value);
    this.cancelEdit();
    this.load();
  }

  prevWeek(): void {
    this.weekStart.update(d => addDays(d, -7));
    this.cancelEdit();
    this.load();
  }

  nextWeek(): void {
    this.weekStart.update(d => addDays(d, 7));
    this.cancelEdit();
    this.load();
  }

  startEdit(iso: string, slot: number): void {
    const item = this.itemAt(iso, slot);
    this.editingPkid = item?.pkid ?? null;
    this.form.reset({ promo: null, topic: '', description: '' });
    if (item) {
      this.form.setValue({
        promo: {
          pkid: item.promotionPkid,
          promoCode: item.promoCode,
          topic: item.topic,
          description: item.description
        },
        topic: item.topic,
        description: item.description
      });
    }
    this.editingKey.set(`${iso}|${slot}`);
  }

  copy(item: FeaturedPromoItem): void {
    this.clipboard.set({
      promotionPkid: item.promotionPkid,
      promoCode: item.promoCode,
      topic: item.topic,
      description: item.description
    });
    this.messageService.add({ severity: 'info', summary: '已複製', detail: item.promoCode });
  }

  paste(iso: string, slot: number): void {
    const copied = this.clipboard();
    if (!copied) {
      return;
    }
    this.editingPkid = null;
    this.form.setValue({
      promo: {
        pkid: copied.promotionPkid,
        promoCode: copied.promoCode,
        topic: copied.topic,
        description: copied.description
      },
      topic: copied.topic,
      description: copied.description
    });
    this.editingKey.set(`${iso}|${slot}`);
  }

  cancelEdit(): void {
    this.editingKey.set(null);
    this.editingPkid = null;
  }

  searchPromo(event: AutoCompleteCompleteEvent): void {
    this.lookupService.getPromotions(event.query).subscribe({
      next: promotions => this.promoSuggestions.set(promotions),
      error: () => this.promoSuggestions.set([])
    });
  }

  onPromoSelect(event: AutoCompleteSelectEvent): void {
    const promotion = event.value as PromotionLookup;
    this.form.patchValue({ topic: promotion.topic, description: promotion.description });
  }

  save(): void {
    const key = this.editingKey();
    if (this.form.invalid || !key) {
      this.form.markAllAsTouched();
      return;
    }
    const [iso, slot] = key.split('|');
    const promo = this.form.value.promo;
    if (typeof promo === 'string') {
      // Typed but not picked from the suggestions — resolve the exact PromoCode
      const code = promo.trim();
      this.saving.set(true);
      this.lookupService.getPromotions(code).subscribe({
        next: promotions => {
          const match = promotions.find(p => p.promoCode.toLowerCase() === code.toLowerCase());
          if (!match) {
            this.saving.set(false);
            this.messageService.add({ severity: 'warn', summary: '查無促銷代碼', detail: code });
            return;
          }
          this.persist(iso, Number(slot), match.pkid);
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({ severity: 'error', summary: '錯誤', detail: '查詢促銷代碼失敗' });
        }
      });
    } else if (promo) {
      this.saving.set(true);
      this.persist(iso, Number(slot), promo.pkid);
    }
  }

  private persist(scheduleOn: string, slot: number, promotionPkid: number): void {
    const { topic, description } = this.form.getRawValue();
    const request: FeaturedPromoItemRequest = {
      pkid: this.editingPkid ?? 0,
      scheduleOn,
      trainingCenterPkid: this.selectedCenter()!,
      slot,
      promotionPkid,
      topic,
      description
    };
    const operation: Observable<unknown> = this.editingPkid
      ? this.service.update(request)
      : this.service.create(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: '成功', detail: '促銷上稿已儲存' });
        this.cancelEdit();
        this.load();
      },
      error: (err: { status?: number }) => {
        this.saving.set(false);
        const detail = err?.status === 409 ? '該時段已有促銷上稿' : '儲存促銷上稿失敗';
        this.messageService.add({ severity: 'error', summary: '錯誤', detail });
      }
    });
  }

  move(item: FeaturedPromoItem, direction: number): void {
    this.service.move(item.pkid, direction).subscribe({
      next: () => this.load(),
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '調整順序失敗' });
      }
    });
  }

  confirmDelete(item: FeaturedPromoItem): void {
    this.confirmationService.confirm({
      header: '刪除確認',
      message: `確定要刪除主代碼 <b>${item.pkid}</b>「${item.promoCode}」？`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: '刪除', severity: 'danger' },
      rejectButtonProps: { label: '取消', severity: 'secondary', outlined: true },
      accept: () => this.delete(item)
    });
  }

  private delete(item: FeaturedPromoItem): void {
    this.service.delete(item.pkid).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: '成功', detail: '促銷上稿已刪除' });
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '刪除促銷上稿失敗' });
      }
    });
  }
}
