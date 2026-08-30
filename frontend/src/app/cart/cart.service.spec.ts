import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { CartService } from './cart.service';
import { LocaleService } from '../i18n/locale.service';
import { NotificationService } from '../shared/notification.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Product } from '../shared/models';
import { vi } from 'vitest';

describe('CartService', () => {
  let cart: CartService;
  let notifications: { success: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
  let getProduct: ReturnType<typeof vi.fn>;

  const product: Product = {
    id: 1,
    sku: 'SKU-1',
    name: 'Book',
    description: '',
    unitPrice: 10,
    imageUrl: '',
    active: true,
    unitsInStock: 5,
  };

  beforeEach(() => {
    localStorage.clear();
    notifications = { success: vi.fn(), info: vi.fn() };
    getProduct = vi.fn().mockReturnValue(of(product));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        LocaleService,
        CartService,
        { provide: NotificationService, useValue: notifications },
        { provide: CatalogApiService, useValue: { getProduct } },
      ],
    });
    cart = TestBed.inject(CartService);
  });

  it('adds and removes line items', () => {
    cart.addToCart(product, 1);
    expect(cart.totalItems()).toBe(1);

    cart.removeFromCart(1);
    expect(cart.totalItems()).toBe(0);
  });

  it('clears the cart and localStorage', () => {
    cart.addToCart(product, 2);
    cart.clearCart();
    expect(cart.totalItems()).toBe(0);
    expect(localStorage.getItem('catalog.cart')).toBe(JSON.stringify([]));
  });

  it('shows out-of-stock toast and skips inactive products', () => {
    cart.addToCart({ ...product, active: false }, 1);
    expect(cart.totalItems()).toBe(0);
    expect(notifications.info).toHaveBeenCalled();

    cart.addToCart({ ...product, unitsInStock: 0 }, 1);
    expect(cart.totalItems()).toBe(0);
  });

  it('caps quantity at available stock when adding and updating', () => {
    cart.addToCart(product, 10);
    expect(cart.items()[0].quantity).toBe(5);

    cart.updateQuantity(1, 99);
    expect(cart.items()[0].quantity).toBe(5);

    cart.updateQuantity(1, 0);
    expect(cart.totalItems()).toBe(0);
  });

  it('hydrates cart lines from localStorage', () => {
    localStorage.setItem(
      'catalog.cart',
      JSON.stringify([{ productId: 1, quantity: 2 }]),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        LocaleService,
        CartService,
        { provide: NotificationService, useValue: notifications },
        { provide: CatalogApiService, useValue: { getProduct } },
      ],
    });
    cart = TestBed.inject(CartService);

    expect(getProduct).toHaveBeenCalledWith(1);
    expect(cart.totalItems()).toBe(2);
  });
});
