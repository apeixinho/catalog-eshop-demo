import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CatalogApiService } from './catalog-api.service';
import { LocaleService } from '../i18n/locale.service';
import { environment } from '../../environments/environment';
import { vi } from 'vitest';

describe('CatalogApiService', () => {
  let api: CatalogApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiBaseUrl}/api/v1`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CatalogApiService,
        {
          provide: LocaleService,
          useValue: { language: vi.fn().mockReturnValue('en') },
        },
      ],
    });

    api = TestBed.inject(CatalogApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getProducts includes lang query param', () => {
    api.getProducts(0, 8).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${base}/products` && r.params.get('lang') === 'en',
    );
    req.flush({ content: [] });
  });

  it('getProduct includes lang and id in path', () => {
    api.getProduct(42).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${base}/products/42` && r.params.get('lang') === 'en',
    );
    req.flush({});
  });

  it('searchByName includes name and optional categoryId', () => {
    api.searchByName('book', 0, 8, 3).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${base}/products/search/findByNameContaining` &&
        r.params.get('name') === 'book' &&
        r.params.get('categoryId') === '3' &&
        r.params.get('lang') === 'en',
    );
    req.flush({ content: [] });
  });

  it('searchByCategory includes category id', () => {
    api.searchByCategory(5, 1, 12).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${base}/products/search/findByCategoryId` &&
        r.params.get('id') === '5' &&
        r.params.get('lang') === 'en',
    );
    req.flush({ content: [] });
  });

  it('getCategories includes lang', () => {
    api.getCategories().subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${base}/product-category` && r.params.get('lang') === 'en',
    );
    req.flush([]);
  });

  it('getCountries includes lang', () => {
    api.getCountries().subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${base}/countries` && r.params.get('lang') === 'en',
    );
    req.flush([]);
  });

  it('getStates includes country code', () => {
    api.getStates('US').subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${base}/states/search/findByCountryCode` &&
        r.params.get('code') === 'US' &&
        r.params.get('lang') === 'en',
    );
    req.flush([]);
  });

  it('getCurrencyRates hits public rates endpoint', () => {
    api.getCurrencyRates().subscribe();
    const req = httpMock.expectOne(`${base}/currency/rates`);
    req.flush({ eur: 0.9 });
  });

  it('purchase sends Idempotency-Key header', () => {
    api.purchase({ orderItems: [] }, 'idem-123').subscribe();
    const req = httpMock.expectOne(`${base}/checkout/purchase`);

    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-123');
    req.flush({ orderTrackingNumber: 'TRK-1', paymentUrl: 'http://pay' });
  });

  it('getOrderStatus encodes tracking number in path', () => {
    api.getOrderStatus('TRK/with space').subscribe();
    const req = httpMock.expectOne(
      `${base}/checkout/orders/${encodeURIComponent('TRK/with space')}`,
    );
    req.flush({ orderTrackingNumber: 'TRK/with space', status: 'PENDING' });
  });

  it('listMyOrders paginates account orders', () => {
    api.listMyOrders(1, 10).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${base}/account/orders` &&
        r.params.get('page') === '1' &&
        r.params.get('size') === '10',
    );
    req.flush({ content: [] });
  });

  it('getMyOrder encodes tracking number', () => {
    api.getMyOrder('TRK-99').subscribe();
    const req = httpMock.expectOne(`${base}/account/orders/TRK-99`);
    req.flush({});
  });

  it('listManageOrders paginates manage orders', () => {
    api.listManageOrders(0, 20).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${base}/manage/orders` && r.params.get('page') === '0',
    );
    req.flush({ content: [] });
  });

  it('getManageOrder fetches by id', () => {
    api.getManageOrder(12).subscribe();
    const req = httpMock.expectOne(`${base}/manage/orders/12`);
    req.flush({});
  });

  it('updateManageOrder sends status body', () => {
    api.updateManageOrder(7, 'CANCELLED').subscribe();
    const req = httpMock.expectOne(`${base}/manage/orders/7`);

    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'CANCELLED' });
    req.flush({});
  });

  it('deleteManageOrder uses DELETE', () => {
    api.deleteManageOrder(3).subscribe();
    const req = httpMock.expectOne(`${base}/manage/orders/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('listManageCustomers paginates customers', () => {
    api.listManageCustomers(2, 5).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${base}/manage/customers` &&
        r.params.get('page') === '2' &&
        r.params.get('size') === '5',
    );
    req.flush({ content: [] });
  });

  it('getManageCustomer fetches by id', () => {
    api.getManageCustomer(8).subscribe();
    const req = httpMock.expectOne(`${base}/manage/customers/8`);
    req.flush({});
  });

  it('createAdminCustomer posts to admin endpoint', () => {
    const body = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      oauthSub: 'sub-1',
    };
    api.createAdminCustomer(body).subscribe();
    const req = httpMock.expectOne(`${base}/admin/customers`);

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 1, ...body, orderCount: 0 });
  });

  it('updateAdminCustomer puts to admin endpoint', () => {
    const body = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      oauthSub: 'sub-1',
    };
    api.updateAdminCustomer(4, body).subscribe();
    const req = httpMock.expectOne(`${base}/admin/customers/4`);

    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 4, ...body, orderCount: 0 });
  });

  it('deleteAdminCustomer uses DELETE', () => {
    api.deleteAdminCustomer(9).subscribe();
    const req = httpMock.expectOne(`${base}/admin/customers/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
