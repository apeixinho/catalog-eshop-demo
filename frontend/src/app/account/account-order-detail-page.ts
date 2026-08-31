import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { OrderDetail } from '../shared/models';

@Component({
  selector: 'app-account-order-detail-page',
  imports: [RouterLink, DecimalPipe, MatButtonModule, MatCardModule, MatTableModule],
  template: `
    <section class="page view-enter page-shell">
      <p class="eyebrow">{{ i18n.t('nav.account') }}</p>
      <h1>{{ i18n.t('orders.detailTitle') }}</h1>

      @if (loading()) {
        <p class="muted">{{ i18n.t('orders.loading') }}</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (order(); as detail) {
        <mat-card class="summary">
          <mat-card-content>
            <p class="mono">{{ detail.orderTrackingNumber }}</p>
            <p>{{ i18n.t('orders.status.' + detail.status) }}</p>
            <p>{{ detail.totalPrice | number: '1.2-2' }} {{ detail.currencyCode }}</p>
          </mat-card-content>
        </mat-card>

        <div class="table-wrap">
          <table mat-table [dataSource]="detail.items" class="items-table">
            <ng-container matColumnDef="product">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('orders.product') }}</th>
              <td mat-cell *matCellDef="let item">#{{ item.productId }}</td>
            </ng-container>

            <ng-container matColumnDef="quantity">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('checkout.quantity') }}</th>
              <td mat-cell *matCellDef="let item">{{ item.quantity }}</td>
            </ng-container>

            <ng-container matColumnDef="unitPrice">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('checkout.unitPrice') }}</th>
              <td mat-cell *matCellDef="let item">
                {{ item.unitPrice | number: '1.2-2' }} {{ detail.currencyCode }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
      }

      <a mat-stroked-button class="back" routerLink="/account/orders">{{
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
      font: var(--mat-sys-display-small);
    }

    .summary {
      margin-bottom: 2rem;
    }

    .summary mat-card-content {
      display: grid;
      gap: 0.35rem;
    }

    .table-wrap {
      overflow-x: auto;
      margin-bottom: 2rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-small);
    }

    .items-table {
      width: 100%;
    }

    .back {
      margin-top: 0.5rem;
    }
  `,
})
export class AccountOrderDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(LocaleService);

  readonly displayedColumns = ['product', 'quantity', 'unitPrice'] as const;

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
