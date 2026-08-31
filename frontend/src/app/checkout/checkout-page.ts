import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CartService } from '../cart/cart.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Country, State } from '../shared/models';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'app-checkout-page',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    @if (cart.isEmpty()) {
      <section class="empty view-enter page-shell">
        <p class="muted">{{ i18n.t('checkout.empty') }}</p>
        <a mat-stroked-button routerLink="/products">{{ i18n.t('cart.return') }}</a>
      </section>
    } @else {
      <section class="checkout view-enter page-shell">
        <h1>{{ i18n.t('checkout.title') }}</h1>
        <div class="layout">
          <form [formGroup]="form" (ngSubmit)="submit()">
            <fieldset>
              <legend>{{ i18n.t('checkout.contact') }}</legend>
              <div class="row">
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ i18n.t('checkout.firstName') }}</mat-label>
                  <input matInput formControlName="firstName" />
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ i18n.t('checkout.lastName') }}</mat-label>
                  <input matInput formControlName="lastName" />
                </mat-form-field>
              </div>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{ i18n.t('checkout.email') }}</mat-label>
                <input matInput type="email" formControlName="email" />
              </mat-form-field>
            </fieldset>

            <fieldset>
              <legend>{{ i18n.t('checkout.delivery') }}</legend>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{ i18n.t('checkout.street') }}</mat-label>
                <input matInput formControlName="street" />
              </mat-form-field>
              <div class="row">
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ i18n.t('checkout.city') }}</mat-label>
                  <input matInput formControlName="city" />
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ i18n.t('checkout.zip') }}</mat-label>
                  <input matInput formControlName="zipCode" />
                </mat-form-field>
              </div>
              <div class="row">
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ i18n.t('checkout.country') }}</mat-label>
                  <mat-select formControlName="country" (selectionChange)="onCountry($event.value)">
                    <mat-option value="" disabled>{{ i18n.t('checkout.selectCountry') }}</mat-option>
                    @for (country of countries(); track country.id) {
                      <mat-option [value]="country.code">{{ country.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ i18n.t('checkout.state') }}</mat-label>
                  <mat-select formControlName="state">
                    <mat-option value="" disabled>{{ i18n.t('checkout.selectState') }}</mat-option>
                    @for (state of states(); track state.id) {
                      <mat-option [value]="state.id">{{ state.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
            </fieldset>

            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || cart.isEmpty() || submitting()"
            >
              @if (submitting()) {
                <mat-spinner diameter="20" />
              } @else {
                {{ i18n.t('checkout.placeOrder') }}
              }
            </button>

            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
          </form>

          <mat-card class="summary">
            <mat-card-header>
              <mat-card-title>{{ i18n.t('checkout.summary') }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <ul>
                @for (item of cart.items(); track item.product.id) {
                  <li>
                    <span>{{ item.product.name }} × {{ item.quantity }}</span>
                    <span class="mono">{{
                      i18n.lineTotal(item.product.unitPrice, item.quantity)
                        | currency
                          : i18n.currencyCode()
                          : 'symbol'
                          : '1.2-2'
                          : i18n.localeId()
                    }}</span>
                  </li>
                }
              </ul>
              <div class="totals">
                <div>
                  <span>{{ i18n.t('cart.subtotal') }}</span>
                  <span class="mono">{{
                    cart.subtotal()
                      | currency: i18n.currencyCode() : 'symbol' : '1.2-2' : i18n.localeId()
                  }}</span>
                </div>
                <div class="grand">
                  <span>{{ i18n.t('checkout.total') }}</span>
                  <span class="mono">{{
                    cart.subtotal()
                      | currency: i18n.currencyCode() : 'symbol' : '1.2-2' : i18n.localeId()
                  }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </section>
    }
  `,
  styles: `
    .checkout,
    .empty {
      padding-block: 3.5rem;
    }

    .empty {
      max-width: 42rem;
      text-align: center;
      margin-inline: auto;
    }

    h1 {
      margin: 0 0 2rem;
      font: var(--mat-sys-headline-medium);
    }

    .layout {
      display: grid;
      gap: 2rem;
    }

    @media (min-width: 1024px) {
      .layout {
        grid-template-columns: 3fr 2fr;
        align-items: start;
      }
    }

    fieldset {
      border: 0;
      margin: 0 0 1.5rem;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }

    legend {
      margin-bottom: 0.75rem;
      font: var(--mat-sys-label-medium);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
    }

    .row {
      display: grid;
      gap: 0.5rem;
    }

    @media (min-width: 640px) {
      .row {
        grid-template-columns: 1fr 1fr;
      }
    }

    mat-form-field {
      width: 100%;
    }

    button[mat-flat-button] {
      margin-top: 0.5rem;
    }

    .summary ul {
      list-style: none;
      margin: 0 0 1.5rem;
      padding: 0;
      display: grid;
      gap: 0.75rem;
    }

    .summary li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      font: var(--mat-sys-body-medium);
    }

    .summary li span:first-child {
      color: var(--mat-sys-on-surface-variant);
    }

    .totals {
      border-top: 1px solid var(--mat-sys-outline-variant);
      padding-top: 1rem;
      display: grid;
      gap: 0.5rem;
    }

    .totals > div {
      display: flex;
      justify-content: space-between;
    }

    .grand {
      font: var(--mat-sys-title-medium);
    }
  `,
})
export class CheckoutPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CatalogApiService);
  readonly cart = inject(CartService);
  readonly i18n = inject(LocaleService);

  readonly countries = signal<Country[]>([]);
  readonly states = signal<State[]>([]);
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);
  private geoSeq = 0;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    street: ['', Validators.required],
    city: ['', Validators.required],
    zipCode: ['', Validators.required],
    country: ['', Validators.required],
    state: [''],
  });

  constructor() {
    effect(() => {
      this.i18n.language();
      untracked(() => {
        const langSeq = ++this.geoSeq;
        this.api.getCountries().subscribe({
          next: (countries) => {
            if (langSeq === this.geoSeq) {
              this.countries.set(countries);
            }
          },
          error: () => {
            if (langSeq === this.geoSeq) {
              this.error.set(this.i18n.t('checkout.loadFailed'));
            }
          },
        });
        const code = this.form.controls.country.value;
        const stateId = this.form.controls.state.value;
        if (code) {
          this.loadStates(code, stateId, langSeq);
        }
      });
    });
  }

  onCountry(code: string): void {
    this.form.controls.state.setValue('');
    this.loadStates(code, '', ++this.geoSeq);
  }

  submit(): void {
    if (this.form.invalid || this.cart.isEmpty()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    const states = this.states();
    let stateId: number | null = null;
    if (states.length > 0) {
      stateId = Number(value.state);
      if (!Number.isFinite(stateId)) {
        this.error.set(this.i18n.t('checkout.purchaseFailed'));
        this.submitting.set(false);
        return;
      }
    } else {
      this.error.set(this.i18n.t('checkout.loadFailed'));
      this.submitting.set(false);
      return;
    }
    const address = {
      street: value.street,
      city: value.city,
      stateId,
      countryCode: value.country,
      zipCode: value.zipCode,
    };
    const body = {
      customer: {
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
      },
      shippingAddress: address,
      billingAddress: address,
      orderItems: this.cart.items().map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      currencyCode: this.i18n.currencyCode(),
    };

    const idempotencyKey = crypto.randomUUID();
    this.api.purchase(body, idempotencyKey).subscribe({
      next: (response) => {
        sessionStorage.setItem('catalog.pending.tracking', response.orderTrackingNumber);
        this.submitting.set(false);
        window.location.href = response.paymentUrl;
      },
      error: () => {
        this.error.set(this.i18n.t('checkout.purchaseFailed'));
        this.submitting.set(false);
      },
    });
  }

  private syncStateValidators(required: boolean): void {
    const control = this.form.controls.state;
    if (required) {
      control.setValidators(Validators.required);
    } else {
      control.clearValidators();
      control.setValue('');
    }
    control.updateValueAndValidity();
  }

  private loadStates(code: string, stateId: string, seq: number): void {
    this.api.getStates(code).subscribe({
      next: (states) => {
        if (seq !== this.geoSeq) {
          return;
        }
        this.states.set(states);
        this.syncStateValidators(states.length > 0);
        if (stateId && !states.some((s) => String(s.id) === String(stateId))) {
          this.form.controls.state.setValue('');
        }
      },
      error: () => {
        if (seq === this.geoSeq) {
          this.states.set([]);
          this.error.set(this.i18n.t('checkout.loadFailed'));
        }
      },
    });
  }
}
