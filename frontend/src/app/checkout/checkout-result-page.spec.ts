import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, convertToParamMap, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CheckoutResultPage } from './checkout-result-page';
import { AuthService } from '../auth/auth.service';
import { CartService } from '../cart/cart.service';
import { CatalogApiService } from '../shared/catalog-api.service';

describe('CheckoutResultPage', () => {
  let fixture: ComponentFixture<CheckoutResultPage>;
  let component: CheckoutResultPage;
  let auth: { ensureValidAccessToken: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn> };
  let api: { getOrderStatus: ReturnType<typeof vi.fn> };
  let cart: { clearCart: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    sessionStorage.clear();
    auth = {
      ensureValidAccessToken: vi.fn().mockResolvedValue('access-token'),
      login: vi.fn(),
    };
    api = {
      getOrderStatus: vi.fn(),
    };
    cart = {
      clearCart: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutResultPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CatalogApiService, useValue: api },
        { provide: CartService, useValue: cart },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();
  });

  async function createWithTracking(tracking: string): Promise<void> {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { queryParamMap: convertToParamMap({ tracking }) },
      },
    });
    fixture = TestBed.createComponent(CheckoutResultPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
  }

  it('shows failed when tracking is missing', async () => {
    fixture = TestBed.createComponent(CheckoutResultPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.status()).toBe('failed');
    expect(api.getOrderStatus).not.toHaveBeenCalled();
  });

  it('reads tracking from sessionStorage when query param is absent', async () => {
    sessionStorage.setItem('catalog.pending.tracking', 'TRK-STORED');
    api.getOrderStatus.mockReturnValue(
      of({ orderTrackingNumber: 'TRK-STORED', status: 'PAID' }),
    );

    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
    });
    fixture = TestBed.createComponent(CheckoutResultPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    expect(component.tracking()).toBe('TRK-STORED');
    expect(sessionStorage.getItem('catalog.pending.tracking')).toBeNull();
  });

  it('starts login when access token is unavailable', async () => {
    auth.ensureValidAccessToken.mockResolvedValue(null);
    await createWithTracking('TRK-LOGIN');

    expect(auth.login).toHaveBeenCalledWith('/checkout/result?tracking=TRK-LOGIN');
  });

  it('shows success and clears cart when order is paid', async () => {
    api.getOrderStatus.mockReturnValue(
      of({ orderTrackingNumber: 'TRK-PAID', status: 'PAID' }),
    );

    await createWithTracking('TRK-PAID');

    expect(component.status()).toBe('success');
    expect(component.tracking()).toBe('TRK-PAID');
    expect(cart.clearCart).toHaveBeenCalled();
  });

  it('shows cancelled when order is cancelled', async () => {
    api.getOrderStatus.mockReturnValue(
      of({ orderTrackingNumber: 'TRK-CANCEL', status: 'CANCELLED' }),
    );

    await createWithTracking('TRK-CANCEL');

    expect(component.status()).toBe('cancelled');
    expect(cart.clearCart).not.toHaveBeenCalled();
  });

  it('shows pending after polling exhausts without terminal status', async () => {
    vi.useFakeTimers();
    api.getOrderStatus.mockReturnValue(
      of({ orderTrackingNumber: 'TRK-PEND', status: 'PENDING' }),
    );

    await createWithTracking('TRK-PEND');
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(component.status()).toBe('pending');
    vi.useRealTimers();
  });

  it('checkAgain re-queries order status', async () => {
    fixture = TestBed.createComponent(CheckoutResultPage);
    component = fixture.componentInstance;
    component.tracking.set('TRK-PEND');
    component.status.set('pending');
    api.getOrderStatus.mockReturnValue(
      of({ orderTrackingNumber: 'TRK-PEND', status: 'PAID' }),
    );

    await component.checkAgain();
    await vi.waitFor(() => {
      expect(component.rechecking()).toBe(false);
    });

    expect(api.getOrderStatus).toHaveBeenCalled();
  });
});
