import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, convertToParamMap, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AccountOrderDetailPage } from './account-order-detail-page';
import { CatalogApiService } from '../shared/catalog-api.service';
import { OrderDetail } from '../shared/models';

describe('AccountOrderDetailPage', () => {
  let fixture: ComponentFixture<AccountOrderDetailPage>;
  let api: { getMyOrder: ReturnType<typeof vi.fn> };
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

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

  const detailTwo: OrderDetail = {
    ...detail,
    orderTrackingNumber: 'TRK-2',
  };

  async function setup(trackingNumber: string): Promise<AccountOrderDetailPage> {
    paramMap$ = new BehaviorSubject(convertToParamMap({ trackingNumber }));
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
            paramMap: paramMap$.asObservable(),
          },
        },
        { provide: CatalogApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountOrderDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('loads order detail for route tracking number', async () => {
    const component = await setup('TRK-1');

    expect(api.getMyOrder).toHaveBeenCalledWith('TRK-1');
    expect(component.order()?.orderTrackingNumber).toBe('TRK-1');
  });

  it('reloads when tracking route param changes', async () => {
    const component = await setup('TRK-1');
    api.getMyOrder.mockClear();
    api.getMyOrder.mockReturnValue(of(detailTwo));

    paramMap$.next(convertToParamMap({ trackingNumber: 'TRK-2' }));
    await fixture.whenStable();

    expect(api.getMyOrder).toHaveBeenCalledWith('TRK-2');
    expect(component.order()?.orderTrackingNumber).toBe('TRK-2');
  });

  it('shows error when detail load fails', async () => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ trackingNumber: 'TRK-404' }));
    api = {
      getMyOrder: vi.fn().mockReturnValue(throwError(() => new Error('fail'))),
    };

    await TestBed.configureTestingModule({
      imports: [AccountOrderDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
          },
        },
        { provide: CatalogApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountOrderDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.error()).not.toBeNull();
  });
});
