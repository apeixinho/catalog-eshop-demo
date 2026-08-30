import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AccountOrdersPage } from './account-orders-page';
import { CatalogApiService } from '../shared/catalog-api.service';
import { LocaleService } from '../i18n/locale.service';
import { OrderSummary } from '../shared/models';

describe('AccountOrdersPage', () => {
  let fixture: ComponentFixture<AccountOrdersPage>;
  let component: AccountOrdersPage;
  let api: { listMyOrders: ReturnType<typeof vi.fn> };

  const order: OrderSummary = {
    id: 1,
    orderTrackingNumber: 'TRK-1',
    status: 'PAID',
    totalPrice: 19.99,
    currencyCode: 'USD',
    totalQuantity: 1,
    dateCreated: '2026-08-30T12:00:00Z',
  };

  beforeEach(async () => {
    api = {
      listMyOrders: vi.fn().mockReturnValue(of({ content: [order] })),
    };

    await TestBed.configureTestingModule({
      imports: [AccountOrdersPage],
      providers: [
        provideRouter([]),
        { provide: CatalogApiService, useValue: api },
        {
          provide: LocaleService,
          useValue: { t: (key: string) => key, language: () => 'en-US' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountOrdersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads orders on init', () => {
    expect(api.listMyOrders).toHaveBeenCalled();
    expect(component.orders()).toEqual([order]);
    expect(component.loading()).toBe(false);
  });

  it('shows error when list load fails', async () => {
    api.listMyOrders.mockReturnValue(throwError(() => new Error('fail')));

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AccountOrdersPage],
      providers: [
        provideRouter([]),
        { provide: CatalogApiService, useValue: api },
        {
          provide: LocaleService,
          useValue: { t: (key: string) => key, language: () => 'en-US' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountOrdersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.error()).toBe('orders.loadFailed');
    expect(component.loading()).toBe(false);
  });

  it('formats dates with active locale', () => {
    const formatted = component.formatDate('2026-08-30T12:00:00Z');
    expect(formatted).toContain('2026');
  });
});
