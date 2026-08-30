import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { OrderSummary } from '../shared/models';

@Component({
  selector: 'app-account-orders-page',
  imports: [RouterLink, DecimalPipe],
  template: `
    <section class="page view-enter page-shell">
      <p class="eyebrow">{{ i18n.t('nav.account') }}</p>
      <h1>{{ i18n.t('orders.title') }}</h1>

      @if (loading()) {
        <p class="muted">{{ i18n.t('orders.loading') }}</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (orders().length === 0) {
        <p class="muted">{{ i18n.t('orders.empty') }}</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ i18n.t('checkout.tracking') }}</th>
                <th>{{ i18n.t('orders.status') }}</th>
                <th>{{ i18n.t('checkout.total') }}</th>
                <th>{{ i18n.t('orders.date') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders(); track order.orderTrackingNumber) {
                <tr>
                  <td class="mono">
                    <a [routerLink]="['/account/orders', order.orderTrackingNumber]">{{
                      order.orderTrackingNumber
                    }}</a>
                  </td>
                  <td>{{ i18n.t('orders.status.' + order.status) }}</td>
                  <td>{{ order.totalPrice | number: '1.2-2' }} {{ order.currencyCode }}</td>
                  <td>{{ formatDate(order.dateCreated) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <a routerLink="/products" class="quiet-btn quiet-btn--outline back">{{
        i18n.t('account.back')
      }}</a>
    </section>
  `,
  styles: `
    .page {
      max-width: 56rem;
      padding-block: 3.5rem;
    }

    h1 {
      margin: 0 0 2rem;
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 2.25rem;
    }

    .eyebrow {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .table-wrap {
      overflow-x: auto;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }

    th,
    td {
      padding: 0.85rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    th {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      background: color-mix(in srgb, var(--border) 35%, transparent);
    }

    .mono {
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }

    .muted,
    .error {
      margin-bottom: 1.5rem;
    }

    .error {
      color: var(--danger, #b42318);
    }

    .back {
      display: inline-block;
      text-decoration: none;
    }
  `,
})
export class AccountOrdersPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  readonly i18n = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly orders = signal<OrderSummary[]>([]);

  ngOnInit(): void {
    this.api.listMyOrders().subscribe({
      next: (page) => {
        this.orders.set(page.content ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.i18n.t('orders.loadFailed'));
        this.loading.set(false);
      },
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString(this.i18n.language());
  }
}
