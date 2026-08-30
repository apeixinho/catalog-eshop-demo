import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CartService } from './cart.service';
import { LocaleService } from '../i18n/locale.service';
import { NotificationService } from '../shared/notification.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Product } from '../shared/models';
import { vi } from 'vitest';

describe('CartService', () => {
  let cart: CartService;

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
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        LocaleService,
        CartService,
        { provide: NotificationService, useValue: { success: vi.fn(), info: vi.fn() } },
        { provide: CatalogApiService, useValue: { getProduct: vi.fn() } },
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

  it('clears the cart', () => {
    cart.addToCart(product, 2);
    cart.clearCart();
    expect(cart.totalItems()).toBe(0);
  });
});
