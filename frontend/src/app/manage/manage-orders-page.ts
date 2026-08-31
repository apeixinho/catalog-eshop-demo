import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { interval } from 'rxjs';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { OrderStatus, OrderSummary } from '../shared/models';

@Component({
  selector: 'app-manage-orders-page',
  imports: [
    RouterLink,
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  template: `
    <section class="page view-enter page-shell">
      <p class="eyebrow">{{ i18n.t('manage.title') }}</p>
      <h1>{{ i18n.t('manage.ordersTitle') }}</h1>

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
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let order">{{ order.id }}</td>
            </ng-container>
            <ng-container matColumnDef="tracking">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('checkout.tracking') }}</th>
              <td mat-cell *matCellDef="let order" class="mono">{{ order.orderTrackingNumber }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('orders.status') }}</th>
              <td mat-cell *matCellDef="let order">
                @if (editingStatusId() === order.id) {
                  <div class="status-edit">
                    <mat-form-field subscriptSizing="dynamic">
                      <mat-select
                        [(ngModel)]="draftStatus"
                        [disabled]="busyId() === order.id"
                        [attr.aria-label]="i18n.t('orders.status')"
                      >
                        @for (status of editableStatuses; track status) {
                          <mat-option [value]="status">{{
                            i18n.t('orders.status.' + status)
                          }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <button
                      mat-button
                      type="button"
                      (click)="saveStatusEdit(order)"
                      [disabled]="busyId() === order.id"
                    >
                      {{ i18n.t('manage.save') }}
                    </button>
                    <button
                      mat-stroked-button
                      type="button"
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
                      mat-stroked-button
                      type="button"
                      (click)="startStatusEdit(order)"
                      [disabled]="busyId() === order.id || order.status !== 'PENDING'"
                    >
                      {{ i18n.t('manage.changeStatus') }}
                    </button>
                  </div>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('checkout.total') }}</th>
              <td mat-cell *matCellDef="let order">
                {{ order.totalPrice | number: '1.2-2' }} {{ order.currencyCode }}
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('manage.actions') }}</th>
              <td mat-cell *matCellDef="let order">
                <button
                  mat-stroked-button
                  type="button"
                  color="warn"
                  (click)="deleteOrder(order)"
                  [disabled]="busyId() === order.id || order.status === 'PENDING'"
                  [attr.title]="
                    order.status === 'PENDING' ? i18n.t('manage.deletePendingHint') : null
                  "
                >
                  {{ i18n.t('manage.delete') }}
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
      }

      <a mat-stroked-button routerLink="/products" class="back">{{ i18n.t('account.back') }}</a>
    </section>
  `,
  styles: `
    .page {
      max-width: 64rem;
      padding-block: 3.5rem;
    }

    h1 {
      margin: 0 0 2rem;
      font: var(--mat-sys-headline-medium);
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
    }

    .orders-table {
      width: 100%;
    }

    .status-view,
    .status-edit {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .back {
      margin-top: 1rem;
    }
  `,
})
export class ManageOrdersPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly i18n = inject(LocaleService);

  readonly displayedColumns = ['id', 'tracking', 'status', 'total', 'actions'];
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
    if (
      document.visibilityState === 'visible' &&
      this.editingStatusId() === null &&
      this.busyId() === null
    ) {
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
        this.error.set(null);
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
    if (order.status === 'PAID') {
      this.dialog
        .open(ConfirmDialog, {
          data: {
            message: this.i18n.t('manage.confirmDeletePaid'),
            confirmLabel: this.i18n.t('manage.delete'),
            cancelLabel: this.i18n.t('manage.cancel'),
          },
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (confirmed) {
            this.performDelete(order);
          }
        });
      return;
    }
    this.performDelete(order);
  }

  performDelete(order: OrderSummary): void {
    this.busyId.set(order.id);
    this.api.deleteManageOrder(order.id).subscribe({
      next: () => {
        this.orders.update((rows) => rows.filter((row) => row.id !== order.id));
        this.busyId.set(null);
      },
      error: () => {
        this.error.set(this.i18n.t('manage.deleteFailed'));
        this.busyId.set(null);
        this.reload(false);
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
