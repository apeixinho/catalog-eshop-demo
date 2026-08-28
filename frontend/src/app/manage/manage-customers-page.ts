import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { CustomerSummary, CustomerUpsert } from '../shared/models';

@Component({
  selector: 'app-manage-customers-page',
  imports: [RouterLink, FormsModule],
  template: `
    <section class="page view-enter page-shell">
      <p class="eyebrow">{{ i18n.t('manage.title') }}</p>
      <h1>{{ i18n.t('manage.customersTitle') }}</h1>

      @if (auth.isAdmin()) {
        <form class="admin-form" (ngSubmit)="saveCustomer()">
          <h2>{{ editingId() ? i18n.t('manage.editCustomer') : i18n.t('manage.createCustomer') }}</h2>
          <div class="grid">
            <label>
              {{ i18n.t('manage.firstName') }}
              <input [(ngModel)]="form.firstName" name="firstName" required />
            </label>
            <label>
              {{ i18n.t('manage.lastName') }}
              <input [(ngModel)]="form.lastName" name="lastName" required />
            </label>
            <label>
              {{ i18n.t('manage.email') }}
              <input [(ngModel)]="form.email" name="email" type="email" required />
            </label>
            <label>
              {{ i18n.t('manage.oauthSub') }}
              <input [(ngModel)]="form.oauthSub" name="oauthSub" required />
            </label>
          </div>
          @if (formError()) {
            <p class="error">{{ formError() }}</p>
          }
          <div class="actions">
            <button type="submit" class="quiet-btn">{{ i18n.t('manage.save') }}</button>
            @if (editingId()) {
              <button type="button" class="quiet-btn quiet-btn--outline" (click)="resetForm()">
                {{ i18n.t('manage.cancel') }}
              </button>
            }
          </div>
        </form>
      }

      @if (loading()) {
        <p class="muted">{{ i18n.t('orders.loading') }}</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{{ i18n.t('manage.name') }}</th>
                <th>{{ i18n.t('manage.email') }}</th>
                <th>{{ i18n.t('manage.orderCount') }}</th>
                @if (auth.isAdmin()) {
                  <th>{{ i18n.t('manage.actions') }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (customer of customers(); track customer.id) {
                <tr>
                  <td>{{ customer.id }}</td>
                  <td>{{ customer.firstName }} {{ customer.lastName }}</td>
                  <td>{{ customer.email }}</td>
                  <td>{{ customer.orderCount }}</td>
                  @if (auth.isAdmin()) {
                    <td class="actions-cell">
                      <button type="button" class="quiet-btn quiet-btn--outline" (click)="editCustomer(customer)">
                        {{ i18n.t('manage.edit') }}
                      </button>
                      <button
                        type="button"
                        class="quiet-btn quiet-btn--outline"
                        (click)="deleteCustomer(customer)"
                        [disabled]="customer.orderCount > 0"
                      >
                        {{ i18n.t('manage.delete') }}
                      </button>
                    </td>
                  }
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

    h2 {
      margin: 0 0 1rem;
      font-size: 1.125rem;
    }

    .eyebrow {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .admin-form {
      margin-bottom: 2rem;
      padding: 1.25rem;
      border: 1px solid var(--border);
    }

    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    }

    label {
      display: grid;
      gap: 0.35rem;
      font-size: 0.85rem;
      color: var(--muted);
    }

    input {
      padding: 0.55rem 0.65rem;
      border: 1px solid var(--border);
      background: var(--surface, #fff);
      color: inherit;
    }

    .actions,
    .actions-cell {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
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

    .error {
      color: var(--danger, #b42318);
    }

    .back {
      display: inline-block;
      text-decoration: none;
    }
  `,
})
export class ManageCustomersPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(LocaleService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly customers = signal<CustomerSummary[]>([]);
  readonly editingId = signal<number | null>(null);

  form: CustomerUpsert = emptyForm();

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
    this.api.deleteAdminCustomer(customer.id).subscribe({
      next: () => this.reload(),
      error: () => this.error.set(this.i18n.t('manage.deleteFailed')),
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
