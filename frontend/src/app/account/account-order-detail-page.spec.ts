import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, convertToParamMap, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AccountOrderDetailPage } from './account-order-detail-page';
import { CatalogApiService } from '../shared/catalog-api.service';
import { OrderDetail } from '../shared/models';

describe('AccountOrderDetailPage', () => {
  let fixture: ComponentFixture<AccountOrderDetailPage>;
  let api: { getMyOrder: ReturnType<typeof vi.fn> };

  const detail: OrderDetail = {
    id: 1,
    orderTrackingNumber: 'TRK-1',
    status: 'PAID',
    totalPrice: 29.98,
    currencyCode: 'USD',
    totalQuantity: 2,
    dateCreated: '2026-08-30T00:00:00Z',
    lastUpdated: '2026-08-30T00:05:00Z',
    paymentUrl: null,
    customer: {
      id: 10,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      orderCount: 1,
    },
    items: [
      {
        productId: 1,
        imageUrl: '/img.png',
        unitPrice: 14.99,
        quantity: 2,
      },
    ],
  };

  beforeEach(async () => {
    api = {
      getMyOrder: vi.fn().mockReturnValue(of(detail)),
    };

    await TestBed.configureTestingModule({
      imports: [AccountOrderDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ trackingNumber: 'TRK-1' }) },
          },
        },
        { provide: CatalogApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountOrderDetailPage);
    fixture.detectChanges();
  });

  it('loads order detail for route tracking number', () => {
    expect(api.getMyOrder).toHaveBeenCalledWith('TRK-1');
    expect(fixture.componentInstance.order()?.orderTrackingNumber).toBe('TRK-1');
  });

  it('shows error when detail load fails', async () => {
    api.getMyOrder.mockReturnValue(throwError(() => new Error('fail')));

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AccountOrderDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ trackingNumber: 'TRK-404' }) },
          },
        },
        { provide: CatalogApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountOrderDetailPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).not.toBeNull();
  });
});
