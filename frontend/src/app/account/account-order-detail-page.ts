import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { OrderDetail } from '../shared/models';

@Component({
  selector: 'app-account-order-detail-page',
  imports: [RouterLink, DecimalPipe],
  template: `
    <section class="page view-enter page-shell">
      <p class="eyebrow">{{ i18n.t('nav.account') }}</p>
      <h1>{{ i18n.t('orders.detailTitle') }}</h1>

      @if (loading()) {
        <p class="muted">{{ i18n.t('orders.loading') }}</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (order(); as detail) {
        <div class="summary">
          <p class="mono">{{ detail.orderTrackingNumber }}</p>
          <p>{{ i18n.t('orders.status.' + detail.status) }}</p>
          <p>
            {{ detail.totalPrice | number: '1.2-2' }} {{ detail.currencyCode }}
          </p>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ i18n.t('orders.product') }}</th>
                <th>{{ i18n.t('checkout.quantity') }}</th>
                <th>{{ i18n.t('checkout.unitPrice') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (item of detail.items; track item.productId) {
                <tr>
                  <td>#{{ item.productId }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ item.unitPrice | number: '1.2-2' }} {{ detail.currencyCode }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <a routerLink="/account/orders" class="quiet-btn quiet-btn--outline back">{{
        i18n.t('orders.backToList')
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

    .summary {
      margin-bottom: 2rem;
      display: grid;
      gap: 0.35rem;
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
    }

    th {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .mono {
      font-family: var(--font-mono);
    }

    .back {
      display: inline-block;
      text-decoration: none;
    }
  `,
})
export class AccountOrderDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly order = signal<OrderDetail | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        tap((params) => {
          if (params.get('trackingNumber')) {
            this.loading.set(true);
            this.error.set(null);
            this.order.set(null);
          }
        }),
        switchMap((params) => {
          const tracking = params.get('trackingNumber');
          if (!tracking) {
            return of({ status: 'missing' as const });
          }
          return this.api.getMyOrder(tracking).pipe(
            map((detail) => ({ status: 'ok' as const, detail })),
            catchError(() => of({ status: 'error' as const })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.status === 'ok') {
          this.order.set(result.detail);
          this.error.set(null);
          this.loading.set(false);
          return;
        }
        this.order.set(null);
        this.error.set(this.i18n.t('orders.loadFailed'));
        this.loading.set(false);
      });
  }
}
