import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../cart/cart.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Country, State } from '../shared/models';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'app-checkout-page',
  imports: [ReactiveFormsModule, CurrencyPipe, RouterLink],
  template: `
    @if (cart.isEmpty()) {
      <section class="empty view-enter page-shell">
        <p>{{ i18n.t('checkout.empty') }}</p>
        <a routerLink="/products" class="quiet-btn quiet-btn--outline">{{ i18n.t('cart.return') }}</a>
      </section>
    } @else {
      <section class="checkout view-enter page-shell">
        <h1>{{ i18n.t('checkout.title') }}</h1>
        <div class="layout">
          <form [formGroup]="form" (ngSubmit)="submit()">
            <fieldset>
              <legend>{{ i18n.t('checkout.contact') }}</legend>
              <div class="row">
                <label>
                  <span>{{ i18n.t('checkout.firstName') }}</span>
                  <input class="gallery-input" formControlName="firstName" />
                </label>
                <label>
                  <span>{{ i18n.t('checkout.lastName') }}</span>
                  <input class="gallery-input" formControlName="lastName" />
                </label>
              </div>
              <label class="full">
                <span>{{ i18n.t('checkout.email') }}</span>
                <input class="gallery-input" type="email" formControlName="email" />
              </label>
            </fieldset>

            <fieldset>
              <legend>{{ i18n.t('checkout.delivery') }}</legend>
              <label class="full">
                <span>{{ i18n.t('checkout.street') }}</span>
                <input class="gallery-input" formControlName="street" />
              </label>
              <div class="row">
                <label>
                  <span>{{ i18n.t('checkout.city') }}</span>
                  <input class="gallery-input" formControlName="city" />
                </label>
                <label>
                  <span>{{ i18n.t('checkout.zip') }}</span>
                  <input class="gallery-input" formControlName="zipCode" />
                </label>
              </div>
              <div class="row">
                <label>
                  <span>{{ i18n.t('checkout.country') }}</span>
                  <select
                    class="gallery-select"
                    formControlName="country"
                    (change)="onCountry($any($event.target).value)"
                  >
                    <option value="" disabled>{{ i18n.t('checkout.selectCountry') }}</option>
                    @for (country of countries(); track country.id) {
                      <option [value]="country.code">{{ country.name }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>{{ i18n.t('checkout.state') }}</span>
                  <select class="gallery-select" formControlName="state">
                    <option value="" disabled>{{ i18n.t('checkout.selectState') }}</option>
                    @for (state of states(); track state.id) {
                      <option [value]="state.id">{{ state.name }}</option>
                    }
                  </select>
                </label>
              </div>
            </fieldset>

            <button
              class="quiet-btn quiet-btn--solid"
              type="submit"
              [disabled]="form.invalid || cart.isEmpty() || submitting()"
            >
              {{ submitting() ? i18n.t('checkout.placingOrder') : i18n.t('checkout.placeOrder') }}
            </button>

            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
          </form>

          <aside class="summary">
            <h2>{{ i18n.t('checkout.summary') }}</h2>
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
          </aside>
        </div>
      </section>
    }
  `,
  styles: `
    .checkout,
    .empty {
      padding-block: 3.5rem;
    }

    @media (min-width: 640px) {
      .checkout,
      .empty {
        padding-block: 5rem;
      }
    }

    .empty {
      max-width: 42rem;
      text-align: center;
      margin-inline: auto;
    }

    .empty p {
      color: var(--muted);
      margin-bottom: 1.5rem;
    }

    .empty a {
      display: inline-block;
      text-decoration: none;
    }

    h1 {
      margin: 0 0 3rem;
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 2.25rem;
      letter-spacing: -0.02em;
    }

    @media (min-width: 640px) {
      h1 {
        font-size: 3rem;
        margin-bottom: 4rem;
      }
    }

    .layout {
      display: grid;
      gap: 3rem;
    }

    @media (min-width: 1024px) {
      .layout {
        grid-template-columns: 3fr 2fr;
        gap: 4rem;
        align-items: start;
      }
    }

    fieldset {
      border: 0;
      margin: 0 0 2rem;
      padding: 0;
      display: grid;
      gap: 1.5rem;
    }

    legend {
      margin-bottom: 1rem;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      padding: 0;
    }

    label {
      display: grid;
      gap: 0.5rem;
    }

    label span {
      font-size: 0.75rem;
      color: var(--muted);
    }

    .row {
      display: grid;
      gap: 1.5rem;
    }

    @media (min-width: 640px) {
      .row {
        grid-template-columns: 1fr 1fr;
      }
    }

    .full {
      width: 100%;
    }

    .summary {
      background: var(--surface);
      padding: 2rem;
    }

    @media (min-width: 640px) {
      .summary {
        padding: 2.5rem;
      }
    }

    .summary h2 {
      margin: 0 0 1.5rem;
      font-size: 0.75rem;
      font-weight: 400;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .summary ul {
      list-style: none;
      margin: 0 0 2rem;
      padding: 0;
      display: grid;
      gap: 1rem;
    }

    .summary li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.875rem;
    }

    .summary li span:first-child {
      color: var(--muted);
    }

    .mono {
      font-family: var(--font-mono);
      flex-shrink: 0;
    }

    .totals {
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
      display: grid;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .totals > div {
      display: flex;
      justify-content: space-between;
    }

    .totals > div span:first-child {
      color: var(--muted);
    }

    .grand {
      padding-top: 0.75rem;
      font-size: 1rem;
    }

    .grand span:first-child {
      color: var(--fg) !important;
    }

    .error {
      margin-top: 1rem;
      color: var(--danger);
      font-size: 0.875rem;
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
