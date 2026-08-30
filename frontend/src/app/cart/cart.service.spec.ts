import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';
import { CartService } from './cart.service';
import { LocaleService } from '../i18n/locale.service';
import { NotificationService } from '../shared/notification.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Product } from '../shared/models';
import { vi } from 'vitest';

describe('CartService', () => {
  let cart: CartService;
  let locale: LocaleService;
  let appRef: ApplicationRef;
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

  function createCartModule(): void {
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
    locale = TestBed.inject(LocaleService);
    appRef = TestBed.inject(ApplicationRef);
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    notifications = { success: vi.fn(), info: vi.fn() };
    getProduct = vi.fn().mockReturnValue(of(product));
    createCartModule();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    createCartModule();

    expect(getProduct).toHaveBeenCalledWith(1);
    expect(cart.totalItems()).toBe(2);
  });

  it('ignores malformed localStorage entries', () => {
    localStorage.setItem('catalog.cart', 'not-json');
    TestBed.resetTestingModule();
    createCartModule();
    expect(cart.totalItems()).toBe(0);

    localStorage.setItem('catalog.cart', JSON.stringify([{ productId: 'x', quantity: 1 }]));
    TestBed.resetTestingModule();
    createCartModule();
    expect(cart.totalItems()).toBe(0);
  });

  it('drops inactive or zero-stock products on hydrate', () => {
    localStorage.setItem(
      'catalog.cart',
      JSON.stringify([{ productId: 1, quantity: 2 }]),
    );
    getProduct.mockReturnValue(of({ ...product, active: false }));

    TestBed.resetTestingModule();
    createCartModule();

    expect(cart.totalItems()).toBe(0);
  });

  it('retries hydrate when all product GETs fail and preserves storage', async () => {
    localStorage.setItem(
      'catalog.cart',
      JSON.stringify([{ productId: 1, quantity: 2 }]),
    );
    getProduct
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(of(product));

    TestBed.resetTestingModule();
    createCartModule();

    expect(cart.totalItems()).toBe(0);
    expect(localStorage.getItem('catalog.cart')).toContain('productId');

    vi.advanceTimersByTime(750);
    await Promise.resolve();

    expect(getProduct).toHaveBeenCalledTimes(2);
    expect(cart.totalItems()).toBe(2);
  });

  it('ignores stale hydrate when cart is mutated during fetch', async () => {
    localStorage.setItem(
      'catalog.cart',
      JSON.stringify([{ productId: 1, quantity: 1 }]),
    );
    getProduct.mockReturnValue(of(product).pipe(delay(100)));

    TestBed.resetTestingModule();
    createCartModule();

    const product2: Product = { ...product, id: 2, name: 'Pen', sku: 'SKU-2' };
    getProduct.mockReturnValue(of(product2));
    cart.addToCart(product2, 1);

    vi.advanceTimersByTime(100);
    await Promise.resolve();

    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0].product.id).toBe(2);
  });

  async function flushEffects(): Promise<void> {
    appRef.tick();
    await appRef.whenStable();
  }

  it('refreshes products when locale country changes', async () => {
    vi.useRealTimers();
    cart.addToCart(product, 1);
    getProduct.mockClear();

    locale.selectCountry('US');
    await flushEffects();

    expect(getProduct).toHaveBeenCalledWith(1);
    vi.useFakeTimers();
  });

  it('removes lines when refresh finds product out of stock', async () => {
    vi.useRealTimers();
    cart.addToCart(product, 2);
    getProduct.mockReturnValue(of({ ...product, unitsInStock: 0 }));

    locale.selectCountry('DE');
    await flushEffects();

    expect(cart.totalItems()).toBe(0);
    vi.useFakeTimers();
  });

  it('computes subtotal via locale lineTotal', () => {
    const lineTotal = vi.spyOn(locale, 'lineTotal').mockReturnValue(42);
    cart.addToCart(product, 2);

    expect(cart.subtotal()).toBe(42);
    expect(lineTotal).toHaveBeenCalledWith(10, 2);
  });
});
