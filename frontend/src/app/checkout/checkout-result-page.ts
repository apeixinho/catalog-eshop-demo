import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';

type ResultStatus = 'loading' | 'success' | 'cancelled' | 'failed' | 'pending';
type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

const MAX_POLL_ATTEMPTS = 24;
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;

@Component({
  selector: 'app-checkout-result-page',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <section class="result view-enter page-shell">
      <mat-card>
        <mat-card-content>
          @if (status() === 'loading') {
            <div class="state">
              <mat-spinner diameter="48" />
              <p class="eyebrow">{{ i18n.t('checkout.verifying') }}</p>
              <h1>{{ i18n.t('checkout.placingOrder') }}</h1>
            </div>
          } @else if (status() === 'success') {
            <p class="eyebrow">{{ i18n.t('checkout.confirmed') }}</p>
            <h1>{{ i18n.t('checkout.paidTitle') }}</h1>
            <p class="lead muted">{{ i18n.t('checkout.paidBody') }}</p>
            @if (tracking()) {
              <div class="tracking">
                <p class="eyebrow">{{ i18n.t('checkout.tracking') }}</p>
                <p class="tracking-value mono">{{ tracking() }}</p>
              </div>
            }
            <a mat-stroked-button routerLink="/products">{{ i18n.t('checkout.continue') }}</a>
          } @else if (status() === 'cancelled') {
            <h1>{{ i18n.t('checkout.paymentCancelledTitle') }}</h1>
            <p class="lead muted">{{ i18n.t('checkout.paymentCancelledBody') }}</p>
            <a mat-stroked-button routerLink="/checkout">{{ i18n.t('checkout.tryAgain') }}</a>
          } @else if (status() === 'pending') {
            <div class="state">
              <mat-spinner diameter="48" />
              <p class="eyebrow">{{ i18n.t('checkout.verifying') }}</p>
              <h1>{{ i18n.t('checkout.pendingTitle') }}</h1>
              <p class="lead muted">{{ i18n.t('checkout.pendingBody') }}</p>
            </div>
            @if (tracking()) {
              <div class="tracking">
                <p class="eyebrow">{{ i18n.t('checkout.tracking') }}</p>
                <p class="tracking-value mono">{{ tracking() }}</p>
              </div>
            }
            <div class="actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="checkAgain()"
                [disabled]="rechecking()"
              >
                {{ i18n.t('checkout.checkAgain') }}
              </button>
              <a mat-stroked-button routerLink="/products">{{ i18n.t('checkout.continue') }}</a>
            </div>
          } @else {
            <h1>{{ i18n.t('checkout.paymentFailedTitle') }}</h1>
            <p class="lead muted">{{ i18n.t('checkout.paymentFailedBody') }}</p>
            <a mat-stroked-button routerLink="/checkout">{{ i18n.t('checkout.tryAgain') }}</a>
          }
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: `
    .result {
      max-width: 42rem;
      padding-block: 5rem;
      margin-inline: auto;
    }

    mat-card-content {
      text-align: center;
    }

    h1 {
      margin: 0 0 1rem;
      font: var(--mat-sys-display-small);
    }

    .state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .lead {
      margin: 0 auto 2rem;
      max-width: 28rem;
      line-height: 1.6;
    }

    .tracking {
      display: inline-block;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-small);
      padding: 1.25rem 2rem;
      margin-bottom: 2rem;
    }

    .tracking-value {
      margin: 0;
      font: var(--mat-sys-title-medium);
      letter-spacing: 0.06em;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
    }
  `,
})
export class CheckoutResultPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cart = inject(CartService);
  private readonly api = inject(CatalogApiService);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(LocaleService);

  readonly status = signal<ResultStatus>('loading');
  readonly tracking = signal<string | null>(null);
  readonly rechecking = signal(false);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const tracking =
      params.get('tracking') ?? sessionStorage.getItem('catalog.pending.tracking');
    sessionStorage.removeItem('catalog.pending.tracking');

    if (!tracking) {
      this.status.set('failed');
      return;
    }

    this.tracking.set(tracking);
    void this.resolveStatus(tracking);
  }

  checkAgain(): void {
    const tracking = this.tracking();
    if (!tracking || this.rechecking()) {
      return;
    }
    this.rechecking.set(true);
    void this.resolveStatus(tracking).finally(() => this.rechecking.set(false));
  }

  private async resolveStatus(tracking: string): Promise<void> {
    const token = await this.auth.ensureValidAccessToken();
    if (!token) {
      void this.auth.login(this.buildReturnUrl(tracking));
      return;
    }

    let delayMs = INITIAL_DELAY_MS;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const apiStatus = await this.pollOrderStatus(tracking);
      if (apiStatus === 'PAID') {
        this.status.set('success');
        this.cart.clearCart();
        return;
      }
      if (apiStatus === 'CANCELLED') {
        this.status.set('cancelled');
        return;
      }
      if (apiStatus === 'unauthorized') {
        void this.auth.login(this.buildReturnUrl(tracking));
        return;
      } else if (apiStatus === 'not_found') {
        this.status.set('failed');
        return;
      }

      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        await sleep(delayMs);
        delayMs = Math.min(Math.round(delayMs * 1.25), MAX_DELAY_MS);
      }
    }

    this.status.set('pending');
  }

  private async pollOrderStatus(
    tracking: string,
  ): Promise<OrderStatus | 'unauthorized' | 'not_found' | 'retry'> {
    try {
      const order = await firstValueFrom(this.api.getOrderStatus(tracking));
      return order.status;
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401 || err.status === 403) {
          return 'unauthorized';
        }
        if (err.status === 404) {
          return 'not_found';
        }
      }
      return 'retry';
    }
  }

  private buildReturnUrl(tracking: string): string {
    return `/checkout/result?tracking=${encodeURIComponent(tracking)}`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
