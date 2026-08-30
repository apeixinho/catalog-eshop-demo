import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { CartPage } from './cart-page';
import { CartService } from './cart.service';
import { LocaleService } from '../i18n/locale.service';

describe('CartPage', () => {
  let fixture: ComponentFixture<CartPage>;
  let component: CartPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [
        provideRouter([]),
        {
          provide: CartService,
          useValue: {
            isEmpty: signal(true),
            items: signal([]),
            subtotal: signal(0),
            updateQuantity: vi.fn(),
            removeFromCart: vi.fn(),
          },
        },
        {
          provide: LocaleService,
          useValue: {
            t: (key: string) => key,
            currencyCode: () => 'USD',
            localeId: () => 'en-US',
            lineTotal: (price: number, qty: number) => price * qty,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders empty cart state', () => {
    expect(fixture.nativeElement.textContent).toContain('cart.emptyTitle');
  });

  it('normalizes image URLs', () => {
    expect(component.imageSrc(null)).toBe('/assets/images/products/placeholder.png');
    expect(component.imageSrc('/img.jpg')).toBe('/img.jpg');
    expect(component.imageSrc('https://cdn/x.jpg')).toBe('https://cdn/x.jpg');
    expect(component.imageSrc('relative.jpg')).toBe('/relative.jpg');
  });
});
