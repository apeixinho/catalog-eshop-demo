import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../auth/auth.service';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { ConfirmDialog } from '../shared/confirm-dialog';
import { CustomerSummary, CustomerUpsert } from '../shared/models';

@Component({
  selector: 'app-manage-customers-page',
  imports: [
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  template: `
    <section class="page view-enter page-shell">
      <p class="eyebrow">{{ i18n.t('manage.title') }}</p>
      <h1>{{ i18n.t('manage.customersTitle') }}</h1>

      @if (auth.isAdmin()) {
        <form class="admin-form" (ngSubmit)="saveCustomer()">
          <h2>{{ editingId() ? i18n.t('manage.editCustomer') : i18n.t('manage.createCustomer') }}</h2>
          <div class="grid">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ i18n.t('manage.firstName') }}</mat-label>
              <input matInput [(ngModel)]="form.firstName" name="firstName" required />
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ i18n.t('manage.lastName') }}</mat-label>
              <input matInput [(ngModel)]="form.lastName" name="lastName" required />
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ i18n.t('manage.email') }}</mat-label>
              <input matInput [(ngModel)]="form.email" name="email" type="email" required />
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ i18n.t('manage.oauthSub') }}</mat-label>
              <input matInput [(ngModel)]="form.oauthSub" name="oauthSub" required />
            </mat-form-field>
          </div>
          @if (formError()) {
            <p class="error">{{ formError() }}</p>
          }
          <div class="actions">
            <button mat-flat-button color="primary" type="submit">{{ i18n.t('manage.save') }}</button>
            @if (editingId()) {
              <button mat-stroked-button type="button" (click)="resetForm()">
                {{ i18n.t('manage.cancel') }}
              </button>
            }
          </div>
        </form>
      }

      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="40" />
          <p class="muted">{{ i18n.t('orders.loading') }}</p>
        </div>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="table-wrap">
          <table mat-table [dataSource]="customers()" class="customers-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let customer">{{ customer.id }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('manage.name') }}</th>
              <td mat-cell *matCellDef="let customer">
                {{ customer.firstName }} {{ customer.lastName }}
              </td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('manage.email') }}</th>
              <td mat-cell *matCellDef="let customer">{{ customer.email }}</td>
            </ng-container>
            <ng-container matColumnDef="orderCount">
              <th mat-header-cell *matHeaderCellDef>{{ i18n.t('manage.orderCount') }}</th>
              <td mat-cell *matCellDef="let customer">{{ customer.orderCount }}</td>
            </ng-container>
            @if (auth.isAdmin()) {
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>{{ i18n.t('manage.actions') }}</th>
                <td mat-cell *matCellDef="let customer">
                  <button mat-stroked-button type="button" (click)="editCustomer(customer)">
                    {{ i18n.t('manage.edit') }}
                  </button>
                  <button
                    mat-stroked-button
                    type="button"
                    color="warn"
                    (click)="deleteCustomer(customer)"
                    [disabled]="customer.orderCount > 0"
                  >
                    {{ i18n.t('manage.delete') }}
                  </button>
                </td>
              </ng-container>
            }
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

    h2 {
      margin: 0 0 1rem;
      font: var(--mat-sys-title-medium);
    }

    .admin-form {
      margin-bottom: 2rem;
      padding: 1.25rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-medium, 12px);
    }

    .grid {
      display: grid;
      gap: 0.5rem;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1rem;
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

    .customers-table {
      width: 100%;
    }

    td button + button {
      margin-left: 0.5rem;
    }

    .back {
      margin-top: 1rem;
    }
  `,
})
export class ManageCustomersPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);
  readonly i18n = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly customers = signal<CustomerSummary[]>([]);
  readonly editingId = signal<number | null>(null);

  form: CustomerUpsert = emptyForm();

  get displayedColumns(): string[] {
    return this.auth.isAdmin()
      ? ['id', 'name', 'email', 'orderCount', 'actions']
      : ['id', 'name', 'email', 'orderCount'];
  }

  ngOnInit(): void {
    this.reload();
  }

  saveCustomer(): void {
    if (!this.auth.isAdmin()) {
      return;
    }
    this.formError.set(null);
    const id = this.editingId();
    const request$ = id
      ? this.api.updateAdminCustomer(id, this.form)
      : this.api.createAdminCustomer(this.form);
    request$.subscribe({
      next: () => {
        this.resetForm();
        this.reload();
      },
      error: () => this.formError.set(this.i18n.t('manage.saveFailed')),
    });
  }

  editCustomer(customer: CustomerSummary): void {
    this.editingId.set(customer.id);
    this.api.getManageCustomer(customer.id).subscribe({
      next: (detail) => {
        this.form = {
          firstName: detail.firstName,
          lastName: detail.lastName,
          email: detail.email,
          oauthSub: detail.oauthSub,
        };
      },
      error: () => this.error.set(this.i18n.t('orders.loadFailed')),
    });
  }

  deleteCustomer(customer: CustomerSummary): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          message: this.i18n.t('manage.delete'),
          confirmLabel: this.i18n.t('manage.delete'),
          cancelLabel: this.i18n.t('manage.cancel'),
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.api.deleteAdminCustomer(customer.id).subscribe({
          next: () => this.reload(),
          error: () => this.error.set(this.i18n.t('manage.deleteFailed')),
        });
      });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form = emptyForm();
    this.formError.set(null);
  }

  private reload(): void {
    this.loading.set(true);
    this.api.listManageCustomers().subscribe({
      next: (page) => {
        this.customers.set(page.content ?? []);
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

function emptyForm(): CustomerUpsert {
  return { firstName: '', lastName: '', email: '', oauthSub: '' };
}
