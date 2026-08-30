import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CheckoutPage } from './checkout-page';
import { CartService } from '../cart/cart.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { LocaleService } from '../i18n/locale.service';
import { Product } from '../shared/models';

describe('CheckoutPage', () => {
  let fixture: ComponentFixture<CheckoutPage>;
  let component: CheckoutPage;
  let api: {
    getCountries: ReturnType<typeof vi.fn>;
    getStates: ReturnType<typeof vi.fn>;
    purchase: ReturnType<typeof vi.fn>;
  };

  const product: Product = {
    id: 1,
    sku: 'SKU-1',
    name: 'Book',
    description: '',
    unitPrice: 19.99,
    imageUrl: '',
    active: true,
    unitsInStock: 3,
  };

  const cart = {
    isEmpty: () => false,
    items: () => [{ product, quantity: 1 }],
    subtotal: () => 19.99,
  };

  beforeEach(async () => {
    api = {
      getCountries: vi
        .fn()
        .mockReturnValue(of([{ id: 1, code: 'US', name: 'United States' }])),
      getStates: vi.fn().mockReturnValue(of([{ id: 10, name: 'California' }])),
      purchase: vi.fn().mockReturnValue(
        of({ orderTrackingNumber: 'TRK-99', paymentUrl: 'http://pay.test/session' }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([]),
        { provide: CatalogApiService, useValue: api },
        { provide: CartService, useValue: cart },
        {
          provide: LocaleService,
          useValue: {
            t: (key: string) => key,
            language: () => 'en',
            currencyCode: () => 'USD',
            localeId: () => 'en-US',
            lineTotal: (price: number, qty: number) => price * qty,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not submit when the form is invalid', () => {
    component.submit();

    expect(api.purchase).not.toHaveBeenCalled();
    expect(component.submitting()).toBe(false);
  });

  it('places order and redirects to payment URL when form is valid', () => {
    const locationAssign = vi.fn();
    vi.stubGlobal('location', { href: '', assign: locationAssign });

    component.states.set([{ id: 10, name: 'California' }]);
    component.form.patchValue({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      street: '1 Main St',
      city: 'San Francisco',
      zipCode: '94105',
      country: 'US',
      state: '10',
    });

    component.submit();

    expect(api.purchase).toHaveBeenCalled();
    expect(sessionStorage.getItem('catalog.pending.tracking')).toBe('TRK-99');
    expect(window.location.href).toBe('http://pay.test/session');
    expect(component.submitting()).toBe(false);

    vi.unstubAllGlobals();
  });

  it('shows error when purchase fails', () => {
    api.purchase.mockReturnValue(throwError(() => new Error('failed')));
    component.states.set([{ id: 10, name: 'California' }]);

    component.form.patchValue({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      street: '1 Main St',
      city: 'San Francisco',
      zipCode: '94105',
      country: 'US',
      state: '10',
    });

    component.submit();

    expect(component.error()).toBeTruthy();
    expect(component.submitting()).toBe(false);
  });

  it('loads states when country changes', () => {
    api.getStates.mockClear();
    component.onCountry('US');

    expect(api.getStates).toHaveBeenCalledWith('US');
    expect(component.form.controls.state.value).toBe('');
  });

  it('shows error when states are not loaded on submit', () => {
    component.states.set([]);
    component.form.patchValue({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      street: '1 Main St',
      city: 'San Francisco',
      zipCode: '94105',
      country: 'US',
      state: '10',
    });

    component.submit();

    expect(api.purchase).not.toHaveBeenCalled();
    expect(component.error()).toBe('checkout.loadFailed');
  });

  it('shows error for invalid state selection', () => {
    component.states.set([{ id: 10, name: 'California' }]);
    component.form.patchValue({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      street: '1 Main St',
      city: 'San Francisco',
      zipCode: '94105',
      country: 'US',
      state: 'bad',
    });

    component.submit();

    expect(api.purchase).not.toHaveBeenCalled();
    expect(component.error()).toBe('checkout.purchaseFailed');
  });
});
