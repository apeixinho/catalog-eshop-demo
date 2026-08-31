import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { OrderSummary } from '../shared/models';

@Component({
  selector: 'app-account-orders-page',
  imports: [RouterLink, DecimalPipe, MatButtonModule, MatProgressSpinnerModule, MatTableModule],
  template: `
    <section class="page view-enter page-shell">
      <p class="eyebrow">{{ i18n.t('nav.account') }}</p>
      <h1>{{ i18n.t('orders.title') }}</h1>

      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="40" />
          <p class="muted">{{ i18n.t('orders.loading') }}</p>
        </div>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (orders().length === 0) {
        <p class="muted">{{ i18n.t('orders.empty') }}</p>
      } @else {
        <div class="table-wrap">
          <table mat-table [dataSource]="orders()" class="orders-table">
            <ng-container matColumnDef="tracking">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('checkout.tracking') }}</th>
              <td mat-cell *matCellDef="let order" class="mono">
                <a [routerLink]="['/account/orders', order.orderTrackingNumber]">{{
                  order.orderTrackingNumber
                }}</a>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('orders.status') }}</th>
              <td mat-cell *matCellDef="let order">{{ i18n.t('orders.status.' + order.status) }}</td>
            </ng-container>

            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('checkout.total') }}</th>
              <td mat-cell *matCellDef="let order">
                {{ order.totalPrice | number: '1.2-2' }} {{ order.currencyCode }}
              </td>
            </ng-container>

            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('orders.date') }}</th>
              <td mat-cell *matCellDef="let order">{{ formatDate(order.dateCreated) }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
      }

      <a mat-stroked-button class="back" routerLink="/products">{{ i18n.t('account.back') }}</a>
    </section>
  `,
  styles: `
    .page {
      max-width: 56rem;
      padding-block: 3.5rem;
    }

    h1 {
      margin: 0 0 2rem;
      font: var(--mat-sys-display-small);
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .table-wrap {
      overflow-x: auto;
      margin-bottom: 2rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-small);
    }

    .orders-table {
      width: 100%;
    }

    .muted,
    .error {
      margin-bottom: 1.5rem;
    }

    .back {
      margin-top: 0.5rem;
    }
  `,
})
export class AccountOrdersPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  readonly i18n = inject(LocaleService);

  readonly displayedColumns = ['tracking', 'status', 'total', 'date'] as const;

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
