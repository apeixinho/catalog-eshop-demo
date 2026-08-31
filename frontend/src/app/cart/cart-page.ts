import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { CartService } from './cart.service';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule, MatDividerModule, MatCardModule],
  template: `
    @if (cart.isEmpty()) {
      <section class="empty view-enter page-shell">
        <h1>{{ i18n.t('cart.emptyTitle') }}</h1>
        <p class="muted">{{ i18n.t('cart.emptyBody') }}</p>
        <a mat-stroked-button routerLink="/products">{{ i18n.t('cart.return') }}</a>
      </section>
    } @else {
      <section class="cart view-enter page-shell">
        <h1>{{ i18n.t('cart.title') }}</h1>
        <ul>
          @for (item of cart.items(); track item.product.id; let last = $last) {
            <li>
              <div class="thumb">
                <img
                  [src]="imageSrc(item.product.imageUrl)"
                  [alt]="item.product.name"
                />
              </div>
              <div class="details">
                <div>
                  <h2>{{ item.product.name }}</h2>
                  @if (item.product.description) {
                    <p>{{ item.product.description }}</p>
                  }
                </div>
                <div class="actions">
                  <div class="qty">
                    <button
                      mat-icon-button
                      type="button"
                      [attr.aria-label]="i18n.t('cart.decrease')"
                      (click)="cart.updateQuantity(item.product.id, item.quantity - 1)"
                    >
                      <mat-icon>remove</mat-icon>
                    </button>
                    <span class="qty-value mono">{{ item.quantity }}</span>
                    <button
                      mat-icon-button
                      type="button"
                      [attr.aria-label]="i18n.t('cart.increase')"
                      (click)="cart.updateQuantity(item.product.id, item.quantity + 1)"
                    >
                      <mat-icon>add</mat-icon>
                    </button>
                  </div>
                  <div class="line">
                    <span class="price mono">{{
                      i18n.lineTotal(item.product.unitPrice, item.quantity)
                        | currency
                          : i18n.currencyCode()
                          : 'symbol'
                          : '1.2-2'
                          : i18n.localeId()
                    }}</span>
                    <button
                      mat-button
                      type="button"
                      (click)="cart.removeFromCart(item.product.id)"
                    >
                      {{ i18n.t('cart.remove') }}
                    </button>
                  </div>
                </div>
              </div>
            </li>
            @if (!last) {
              <mat-divider />
            }
          }
        </ul>
        <mat-card class="summary">
          <mat-card-content>
            <div class="summary-inner">
              <div>
                <p class="label">{{ i18n.t('cart.subtotal') }}</p>
                <p class="total mono">{{
                  cart.subtotal()
                    | currency: i18n.currencyCode() : 'symbol' : '1.2-2' : i18n.localeId()
                }}</p>
                <p class="note muted">{{ i18n.t('cart.shippingNote') }}</p>
              </div>
              <a mat-flat-button color="primary" routerLink="/checkout">{{ i18n.t('cart.checkout') }}</a>
            </div>
          </mat-card-content>
        </mat-card>
      </section>
    }
  `,
  styles: `
    .empty {
      max-width: 42rem;
      padding-block: 6rem;
      text-align: center;
    }

    @media (min-width: 640px) {
      .empty {
        padding-block: 8rem;
      }
    }

    .empty h1,
    .cart h1 {
      margin: 0 0 1rem;
      font: var(--mat-sys-display-small);
    }

    @media (min-width: 640px) {
      .empty h1,
      .cart h1 {
        font: var(--mat-sys-display-medium);
      }
    }

    .empty p {
      margin: 0 auto 2.5rem;
      max-width: 24rem;
      line-height: 1.6;
    }

    .cart {
      max-width: 48rem;
      padding-block: 3.5rem;
    }

    @media (min-width: 640px) {
      .cart {
        padding-block: 5rem;
      }

      .cart h1 {
        margin-bottom: 4rem;
      }
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: flex;
      gap: 1.25rem;
      padding-block: 2rem;
    }

    @media (min-width: 640px) {
      li {
        gap: 2rem;
      }
    }

    .thumb {
      width: 5rem;
      flex-shrink: 0;
      aspect-ratio: 3 / 4;
      overflow: hidden;
      background: var(--mat-sys-surface-container);
      border-radius: var(--mat-sys-corner-small);
    }

    @media (min-width: 640px) {
      .thumb {
        width: 6rem;
      }
    }

    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
    }

    h2 {
      margin: 0;
      font: var(--mat-sys-title-large);
    }

    .details p {
      margin: 0.35rem 0 0;
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .qty {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .qty-value {
      font: var(--mat-sys-body-medium);
      width: 1.5rem;
      text-align: center;
    }

    .line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .price {
      font: var(--mat-sys-body-medium);
    }

    .summary {
      margin-top: 3rem;
    }

    .summary-inner {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    @media (min-width: 640px) {
      .summary-inner {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }

    .label {
      margin: 0 0 0.25rem;
      font: var(--mat-sys-label-medium);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
    }

    .total {
      margin: 0;
      font: var(--mat-sys-headline-small);
    }

    .note {
      margin: 0.5rem 0 0;
      font: var(--mat-sys-body-small);
    }
  `,
})
export class CartPage {
  readonly cart = inject(CartService);
  readonly i18n = inject(LocaleService);

  imageSrc(url: string | null | undefined): string {
    if (!url) {
      return '/assets/images/products/placeholder.png';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url;
    }
    return `/${url}`;
  }
}
