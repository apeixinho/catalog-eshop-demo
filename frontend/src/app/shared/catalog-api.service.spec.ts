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

  it('updateManageOrder sends status body', () => {
    api.updateManageOrder(7, 'CANCELLED').subscribe();
    const req = httpMock.expectOne(`${base}/manage/orders/7`);

    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'CANCELLED' });
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
});
