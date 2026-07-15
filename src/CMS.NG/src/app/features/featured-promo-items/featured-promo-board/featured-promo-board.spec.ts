import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { FeaturedPromoBoard } from './featured-promo-board';
import { FeaturedPromoItem, PromotionLookup } from '../../../core/models/featured-promo-item.model';
import { addDays, startOfWeek, toIso } from '../../../core/utils/date.util';

describe('FeaturedPromoBoard', () => {
  let fixture: ComponentFixture<FeaturedPromoBoard>;
  let component: FeaturedPromoBoard;
  let httpMock: HttpTestingController;
  const queryUrl = `${environment.apiUrl}/featured-promo-items/query`;
  const centersUrl = `${environment.apiUrl}/lookups/training-centers`;
  const promotionsUrl = `${environment.apiUrl}/lookups/promotions`;

  const monday = startOfWeek(new Date());
  const mondayIso = toIso(monday);
  const sundayIso = toIso(addDays(monday, 6));

  const centers = [
    { pkid: 1, name: '台北' },
    { pkid: 2, name: '新竹' },
    { pkid: 3, name: '台中' }
  ];

  const items: FeaturedPromoItem[] = [
    {
      pkid: 11,
      scheduleOn: mondayIso,
      trainingCenterPkid: 1,
      slot: 1,
      promotionPkid: 10,
      topic: '成為能AI協作的程式設計師',
      description: '轉職就業養成班，三大主流語言任你選',
      promoCode: '20251204_SkillTrainAI'
    },
    {
      pkid: 12,
      scheduleOn: mondayIso,
      trainingCenterPkid: 1,
      slot: 2,
      promotionPkid: 11,
      topic: 'Google AI工具一次掌握',
      description: '不需技術基礎！最新Google AI實戰課程',
      promoCode: '251211_GoogleAI'
    }
  ];

  const promotion: PromotionLookup = {
    pkid: 20,
    promoCode: '20251215_n8n',
    topic: 'n8n自動化三部曲',
    description: '從自動化新手到企業級AI架構師學習路徑'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturedPromoBoard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        providePrimeNG(),
        ConfirmationService,
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FeaturedPromoBoard);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function flushInit(boardItems: FeaturedPromoItem[] = items): void {
    fixture.detectChanges(); // triggers ngOnInit
    httpMock.expectOne(centersUrl).flush(centers);
    const req = httpMock.expectOne(queryUrl);
    expect(req.request.method).toBe('POST');
    req.flush(boardItems);
    fixture.detectChanges();
  }

  describe('list (weekly board)', () => {
    it('should load training centers, select the first tab and query the current week', () => {
      fixture.detectChanges();
      httpMock.expectOne(centersUrl).flush(centers);

      const req = httpMock.expectOne(queryUrl);
      expect(req.request.method).toBe('POST');
      // one-week filter: Monday..Sunday of the current week
      expect(req.request.body.scheduleOnFrom).toBe(mondayIso);
      expect(req.request.body.scheduleOnTo).toBe(sundayIso);
      // TrainingCenter filter: first tab is active by default
      expect(req.request.body.trainingCenterPkid).toBe(1);
      req.flush(items);
      fixture.detectChanges();

      expect(component.trainingCenters().length).toBe(3);
      expect(component.selectedCenter()).toBe(1);
      expect(component.items().length).toBe(2);
    });

    it('should render one tab per training center and 7 day sections with 3 slots each', () => {
      flushInit();
      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelectorAll('p-tab').length).toBe(3);
      expect(element.querySelectorAll('.day-header').length).toBe(7);
      expect(element.querySelectorAll('.slot-row').length).toBe(21);
      expect(element.textContent).toContain('20251204_SkillTrainAI');
      expect(element.textContent).toContain('Google AI工具一次掌握');
    });

    it('should re-query with the clicked tab as the TrainingCenter filter', () => {
      flushInit();

      component.selectCenter(2);

      const req = httpMock.expectOne(queryUrl);
      expect(req.request.body.trainingCenterPkid).toBe(2);
      expect(req.request.body.scheduleOnFrom).toBe(mondayIso);
      req.flush([]);
      expect(component.selectedCenter()).toBe(2);
    });

    it('nextWeek/prevWeek should shift the one-week ScheduleOn filter by 7 days', () => {
      flushInit();

      component.nextWeek();
      let req = httpMock.expectOne(queryUrl);
      expect(req.request.body.scheduleOnFrom).toBe(toIso(addDays(monday, 7)));
      expect(req.request.body.scheduleOnTo).toBe(toIso(addDays(monday, 13)));
      req.flush([]);

      component.prevWeek();
      req = httpMock.expectOne(queryUrl);
      expect(req.request.body.scheduleOnFrom).toBe(mondayIso);
      expect(req.request.body.scheduleOnTo).toBe(sundayIso);
      req.flush(items);
    });

    it('move should POST the direction and reload the board', () => {
      flushInit();

      component.move(items[0], 1);

      const moveReq = httpMock.expectOne(`${environment.apiUrl}/featured-promo-items/11/move`);
      expect(moveReq.request.method).toBe('POST');
      expect(moveReq.request.body).toEqual({ direction: 1 });
      moveReq.flush(null);

      httpMock.expectOne(queryUrl).flush(items);
    });

    it('delete (via confirm accept) should call DELETE and reload', () => {
      const confirmationService = TestBed.inject(ConfirmationService);
      spyOn(confirmationService, 'confirm').and.callFake((options: any) => {
        options.accept();
        return confirmationService;
      });
      flushInit();

      component.confirmDelete(items[0]);

      const deleteReq = httpMock.expectOne(`${environment.apiUrl}/featured-promo-items/11`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(null);

      httpMock.expectOne(queryUrl).flush([items[1]]);
      expect(component.items().length).toBe(1);
    });
  });

  describe('edit form', () => {
    it('startEdit on an occupied slot should show the inline form with existing values', () => {
      flushInit();

      component.startEdit(mondayIso, 1);
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('form.slot-edit')).toBeTruthy();
      const promo = component.form.controls.promo.value as PromotionLookup;
      expect(promo.promoCode).toBe('20251204_SkillTrainAI');
      expect(component.form.controls.topic.value).toBe('成為能AI協作的程式設計師');
      expect(component.form.controls.description.value).toBe(
        '轉職就業養成班，三大主流語言任你選'
      );
    });

    it('searchPromo should look up promotions by PromoCode keyword', () => {
      flushInit();

      component.searchPromo({ query: 'n8n' } as any);

      const req = httpMock.expectOne(
        r => r.url === promotionsUrl && r.params.get('keyword') === 'n8n'
      );
      expect(req.request.method).toBe('GET');
      req.flush([promotion]);
      expect(component.promoSuggestions()).toEqual([promotion]);
    });

    it('selecting a promotion suggestion should set Promotion and fill topic/description', () => {
      flushInit();
      component.startEdit(mondayIso, 1);

      component.form.controls.promo.setValue(promotion);
      component.onPromoSelect({ value: promotion } as any);

      expect(component.form.controls.topic.value).toBe('n8n自動化三部曲');
      expect(component.form.controls.description.value).toBe(
        '從自動化新手到企業級AI架構師學習路徑'
      );
    });

    it('save on an existing item should PUT the update with the resolved Promotion_pkid', () => {
      flushInit();
      component.startEdit(mondayIso, 1);

      component.form.controls.promo.setValue(promotion);
      component.onPromoSelect({ value: promotion } as any);
      component.save();

      const req = httpMock.expectOne(`${environment.apiUrl}/featured-promo-items`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.pkid).toBe(11);
      expect(req.request.body.scheduleOn).toBe(mondayIso);
      expect(req.request.body.trainingCenterPkid).toBe(1);
      expect(req.request.body.slot).toBe(1);
      expect(req.request.body.promotionPkid).toBe(20);
      expect(req.request.body.topic).toBe('n8n自動化三部曲');
      req.flush(null);

      httpMock.expectOne(queryUrl).flush(items);
      expect(component.editingKey()).toBeNull();
    });

    it('save with a typed (unselected) PromoCode should resolve it via lookup before saving', () => {
      flushInit();
      component.startEdit(mondayIso, 1);

      component.form.controls.promo.setValue('20251215_n8n');
      component.save();

      const lookupReq = httpMock.expectOne(
        r => r.url === promotionsUrl && r.params.get('keyword') === '20251215_n8n'
      );
      lookupReq.flush([promotion]);

      const req = httpMock.expectOne(`${environment.apiUrl}/featured-promo-items`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.promotionPkid).toBe(20);
      req.flush(null);

      httpMock.expectOne(queryUrl).flush(items);
    });

    it('save with an unknown typed PromoCode should warn and not save', () => {
      flushInit();
      component.startEdit(mondayIso, 1);

      component.form.controls.promo.setValue('NO_SUCH_CODE');
      component.save();

      const lookupReq = httpMock.expectOne(
        r => r.url === promotionsUrl && r.params.get('keyword') === 'NO_SUCH_CODE'
      );
      lookupReq.flush([]);

      httpMock.expectNone(`${environment.apiUrl}/featured-promo-items`);
      expect(component.saving()).toBeFalse();
    });
  });

  describe('new form', () => {
    it('startEdit on an empty slot should show an empty inline form', () => {
      flushInit();

      component.startEdit(mondayIso, 3);
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('form.slot-edit')).toBeTruthy();
      expect(component.form.controls.promo.value).toBeNull();
      expect(component.form.controls.topic.value).toBe('');
      expect(component.form.controls.description.value).toBe('');
    });

    it('save on an empty slot should POST a create with the slot, date and tab values', () => {
      flushInit();
      component.startEdit(mondayIso, 3);

      component.form.controls.promo.setValue(promotion);
      component.onPromoSelect({ value: promotion } as any);
      component.save();

      const req = httpMock.expectOne(`${environment.apiUrl}/featured-promo-items`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.pkid).toBe(0);
      expect(req.request.body.scheduleOn).toBe(mondayIso);
      expect(req.request.body.trainingCenterPkid).toBe(1);
      expect(req.request.body.slot).toBe(3);
      expect(req.request.body.promotionPkid).toBe(20);
      req.flush({ pkid: 99 });

      httpMock.expectOne(queryUrl).flush(items);
      expect(component.editingKey()).toBeNull();
    });

    it('save with an invalid form should not call the API', () => {
      flushInit();
      component.startEdit(mondayIso, 3);

      component.save();

      httpMock.expectNone(`${environment.apiUrl}/featured-promo-items`);
      expect(component.form.controls.promo.touched).toBeTrue();
    });

    it('copy then paste should open the new form pre-filled with the copied values', () => {
      flushInit();

      component.copy(items[0]);
      expect(component.clipboard()?.promoCode).toBe('20251204_SkillTrainAI');

      component.paste(mondayIso, 3);
      fixture.detectChanges();

      expect(component.editingKey()).toBe(`${mondayIso}|3`);
      const promo = component.form.controls.promo.value as PromotionLookup;
      expect(promo.pkid).toBe(10);
      expect(component.form.controls.topic.value).toBe('成為能AI協作的程式設計師');

      component.save();
      const req = httpMock.expectOne(`${environment.apiUrl}/featured-promo-items`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.slot).toBe(3);
      expect(req.request.body.promotionPkid).toBe(10);
      req.flush({ pkid: 99 });
      httpMock.expectOne(queryUrl).flush(items);
    });

    it('paste without a copied item should do nothing', () => {
      flushInit();

      component.paste(mondayIso, 3);

      expect(component.editingKey()).toBeNull();
    });
  });
});
