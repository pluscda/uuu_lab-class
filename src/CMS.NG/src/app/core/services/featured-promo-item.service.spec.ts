import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { FeaturedPromoItemService } from './featured-promo-item.service';
import {
  FeaturedPromoItem,
  FeaturedPromoItemRequest
} from '../models/featured-promo-item.model';

describe('FeaturedPromoItemService', () => {
  let service: FeaturedPromoItemService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/featured-promo-items`;

  const item: FeaturedPromoItem = {
    pkid: 11,
    scheduleOn: '2026-03-16',
    trainingCenterPkid: 1,
    slot: 1,
    promotionPkid: 10,
    topic: '成為能AI協作的程式設計師',
    description: '轉職就業養成班',
    promoCode: '20251204_SkillTrainAI'
  };

  const request: FeaturedPromoItemRequest = {
    pkid: 11,
    scheduleOn: '2026-03-16',
    trainingCenterPkid: 1,
    slot: 1,
    promotionPkid: 10,
    topic: '成為能AI協作的程式設計師',
    description: '轉職就業養成班'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(FeaturedPromoItemService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll should GET all items', () => {
    service.getAll().subscribe(result => expect(result).toEqual([item]));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([item]);
  });

  it('query should POST the one-week ScheduleOn range and TrainingCenter filter', () => {
    const query = {
      scheduleOnFrom: '2026-03-16',
      scheduleOnTo: '2026-03-22',
      trainingCenterPkid: 1
    };
    service.query(query).subscribe(result => expect(result).toEqual([item]));

    const req = httpMock.expectOne(`${baseUrl}/query`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(query);
    req.flush([item]);
  });

  it('getById should GET a single item', () => {
    service.getById(11).subscribe(result => expect(result).toEqual(item));

    const req = httpMock.expectOne(`${baseUrl}/11`);
    expect(req.request.method).toBe('GET');
    req.flush(item);
  });

  it('create should POST the request', () => {
    service.create(request).subscribe(result => expect(result.pkid).toBe(11));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ pkid: 11 });
  });

  it('update should PUT the request with pkid in the body', () => {
    service.update(request).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.pkid).toBe(11);
    req.flush(null);
  });

  it('delete should DELETE by pkid', () => {
    service.delete(11).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/11`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('move should POST the direction to the move endpoint', () => {
    service.move(11, -1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/11/move`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ direction: -1 });
    req.flush(null);
  });
});
