import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { OrderStatus, OrderSummary } from '../shared/models';

@Component({
  selector: 'app-manage-orders-page',
  imports: [RouterLink, DecimalPipe, FormsModule],
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
                    @if (editingStatusId() === order.id) {
                      <div class="status-edit">
                        <select
                          [(ngModel)]="draftStatus"
                          [disabled]="busyId() === order.id"
                          [attr.aria-label]="i18n.t('orders.status')"
                        >
                          @for (status of editableStatuses; track status) {
                            <option [ngValue]="status">{{
                              i18n.t('orders.status.' + status)
                            }}</option>
                          }
                        </select>
                        <button
                          type="button"
                          class="quiet-btn"
                          (click)="saveStatusEdit(order)"
                          [disabled]="busyId() === order.id"
                        >
                          {{ i18n.t('manage.save') }}
                        </button>
                        <button
                          type="button"
                          class="quiet-btn quiet-btn--outline"
                          (click)="cancelStatusEdit()"
                          [disabled]="busyId() === order.id"
                        >
                          {{ i18n.t('manage.cancel') }}
                        </button>
                      </div>
                    } @else {
                      <div class="status-view">
                        <span>{{ i18n.t('orders.status.' + order.status) }}</span>
                        <button
                          type="button"
                          class="quiet-btn quiet-btn--outline"
                          (click)="startStatusEdit(order)"
                          [disabled]="busyId() === order.id || order.status !== 'PENDING'"
                        >
                          {{ i18n.t('manage.changeStatus') }}
                        </button>
                      </div>
                    }
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

    .status-view,
    .status-edit {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
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
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(LocaleService);

  readonly editableStatuses: OrderStatus[] = ['PENDING', 'CANCELLED'];
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly orders = signal<OrderSummary[]>([]);
  readonly busyId = signal<number | null>(null);
  readonly editingStatusId = signal<number | null>(null);
  draftStatus: OrderStatus = 'PENDING';

  ngOnInit(): void {
    this.reload();
    interval(15_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.editingStatusId() === null && this.busyId() === null) {
          this.reload(false);
        }
      });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.destroyRef.onDestroy(() =>
        document.removeEventListener('visibilitychange', this.onVisibilityChange),
      );
    }
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.editingStatusId() === null && this.busyId() === null) {
      this.reload(false);
    }
  };

  startStatusEdit(order: OrderSummary): void {
    this.editingStatusId.set(order.id);
    this.draftStatus = order.status;
  }

  cancelStatusEdit(): void {
    this.editingStatusId.set(null);
  }

  saveStatusEdit(order: OrderSummary): void {
    if (this.draftStatus === order.status) {
      this.cancelStatusEdit();
      return;
    }
    this.updateOrderStatus(order, this.draftStatus);
  }

  private updateOrderStatus(order: OrderSummary, status: OrderStatus): void {
    this.busyId.set(order.id);
    this.api.updateManageOrder(order.id, status).subscribe({
      next: (updated) => {
        this.orders.update((rows) =>
          rows.map((row) => (row.id === updated.id ? { ...row, status: updated.status } : row)),
        );
        this.busyId.set(null);
        this.editingStatusId.set(null);
      },
      error: () => {
        this.error.set(this.i18n.t('manage.saveFailed'));
        this.busyId.set(null);
        this.reload();
      },
    });
  }

  deleteOrder(order: OrderSummary): void {
    if (
      order.status === 'PAID' &&
      !window.confirm(this.i18n.t('manage.confirmDeletePaid'))
    ) {
      return;
    }
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

  private reload(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }
    this.api.listManageOrders().subscribe({
      next: (page) => {
        this.orders.set(page.content ?? []);
        this.error.set(null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.i18n.t('orders.loadFailed'));
        this.loading.set(false);
      },
    });
  }
}
