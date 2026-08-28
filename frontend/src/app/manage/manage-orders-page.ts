import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { OrderStatus, OrderSummary } from '../shared/models';

@Component({
  selector: 'app-manage-orders-page',
  imports: [RouterLink, DecimalPipe],
  template: `
    <section class="page view-enter page-shell">
      <p class="eyebrow">{{ i18n.t('manage.title') }}</p>
      <h1>{{ i18n.t('manage.ordersTitle') }}</h1>

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
                <th>ID</th>
                <th>{{ i18n.t('checkout.tracking') }}</th>
                <th>{{ i18n.t('orders.status') }}</th>
                <th>{{ i18n.t('checkout.total') }}</th>
                <th>{{ i18n.t('manage.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders(); track order.id) {
                <tr>
                  <td>{{ order.id }}</td>
                  <td class="mono">{{ order.orderTrackingNumber }}</td>
                  <td>
                    <select
                      [value]="order.status"
                      (change)="onStatusChange(order, $any($event.target).value)"
                      [disabled]="busyId() === order.id"
                    >
                      @for (status of statuses; track status) {
                        <option [value]="status">{{ i18n.t('orders.status.' + status) }}</option>
                      }
                    </select>
                  </td>
                  <td>{{ order.totalPrice | number: '1.2-2' }} {{ order.currencyCode }}</td>
                  <td>
                    <button
                      type="button"
                      class="quiet-btn quiet-btn--outline"
                      (click)="deleteOrder(order)"
                      [disabled]="busyId() === order.id"
                    >
                      {{ i18n.t('manage.delete') }}
                    </button>
                  </td>
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
      max-width: 64rem;
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
    }

    th,
    td {
      padding: 0.85rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }

    th {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    select {
      min-width: 8rem;
      padding: 0.35rem 0.5rem;
      border: 1px solid var(--border);
      background: var(--surface, #fff);
      color: inherit;
    }

    .mono {
      font-family: var(--font-mono);
      font-size: 0.85rem;
    }

    .back {
      display: inline-block;
      text-decoration: none;
    }
  `,
})
export class ManageOrdersPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  readonly i18n = inject(LocaleService);

  readonly statuses: OrderStatus[] = ['PENDING', 'PAID', 'CANCELLED'];
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly orders = signal<OrderSummary[]>([]);
  readonly busyId = signal<number | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  onStatusChange(order: OrderSummary, status: OrderStatus): void {
    this.busyId.set(order.id);
    this.api.updateManageOrder(order.id, status).subscribe({
      next: (updated) => {
        this.orders.update((rows) =>
          rows.map((row) => (row.id === updated.id ? { ...row, status: updated.status } : row)),
        );
        this.busyId.set(null);
      },
      error: () => {
        this.error.set(this.i18n.t('manage.saveFailed'));
        this.busyId.set(null);
        this.reload();
      },
    });
  }

  deleteOrder(order: OrderSummary): void {
    this.busyId.set(order.id);
    this.api.deleteManageOrder(order.id).subscribe({
      next: () => {
        this.orders.update((rows) => rows.filter((row) => row.id !== order.id));
        this.busyId.set(null);
      },
      error: () => {
        this.error.set(this.i18n.t('manage.deleteFailed'));
        this.busyId.set(null);
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.api.listManageOrders().subscribe({
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
}
