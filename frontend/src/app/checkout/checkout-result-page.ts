import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';

type ResultStatus = 'loading' | 'success' | 'cancelled' | 'failed';

@Component({
  selector: 'app-checkout-result-page',
  imports: [RouterLink],
  template: `
    <section class="result view-enter page-shell">
      @if (status() === 'loading') {
        <p class="eyebrow">{{ i18n.t('checkout.verifying') }}</p>
        <h1>{{ i18n.t('checkout.placingOrder') }}</h1>
      } @else if (status() === 'success') {
        <p class="eyebrow">{{ i18n.t('checkout.confirmed') }}</p>
        <h1>{{ i18n.t('checkout.paidTitle') }}</h1>
        <p class="lead">{{ i18n.t('checkout.paidBody') }}</p>
        @if (tracking()) {
          <div class="tracking">
            <p class="eyebrow">{{ i18n.t('checkout.tracking') }}</p>
            <p class="tracking-value">{{ tracking() }}</p>
          </div>
        }
        <a routerLink="/products" class="quiet-btn quiet-btn--outline">{{
          i18n.t('checkout.continue')
        }}</a>
      } @else if (status() === 'cancelled') {
        <h1>{{ i18n.t('checkout.paymentCancelledTitle') }}</h1>
        <p class="lead">{{ i18n.t('checkout.paymentCancelledBody') }}</p>
        <a routerLink="/checkout" class="quiet-btn quiet-btn--outline">{{
          i18n.t('checkout.tryAgain')
        }}</a>
      } @else {
        <h1>{{ i18n.t('checkout.paymentFailedTitle') }}</h1>
        <p class="lead">{{ i18n.t('checkout.paymentFailedBody') }}</p>
        <a routerLink="/checkout" class="quiet-btn quiet-btn--outline">{{
          i18n.t('checkout.tryAgain')
        }}</a>
      }
    </section>
  `,
  styles: `
    .result {
      max-width: 42rem;
      padding-block: 5rem;
      text-align: center;
      margin-inline: auto;
    }

    h1 {
      margin: 0 0 1rem;
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 2.25rem;
    }

    .eyebrow {
      margin: 0 0 1rem;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .lead {
      margin: 0 auto 2rem;
      max-width: 28rem;
      color: var(--muted);
      line-height: 1.6;
    }

    .tracking {
      display: inline-block;
      border: 1px solid var(--border);
      padding: 1.25rem 2rem;
      margin-bottom: 2.5rem;
    }

    .tracking-value {
      margin: 0;
      font-family: var(--font-mono);
      font-size: 1.125rem;
      letter-spacing: 0.06em;
    }

    a {
      display: inline-block;
      text-decoration: none;
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

  private async resolveStatus(tracking: string): Promise<void> {
    const token = await this.auth.ensureValidAccessToken();
    if (!token) {
      const returnUrl = `/checkout/result?tracking=${encodeURIComponent(tracking)}`;
      void this.auth.login(returnUrl);
      return;
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const order = await firstValueFrom(this.api.getOrderStatus(tracking));
        if (order.status === 'PAID') {
          this.status.set('success');
          this.cart.clearCart();
          return;
        }
        if (order.status === 'CANCELLED') {
          this.status.set('cancelled');
          return;
        }
      } catch {
        this.status.set('failed');
        return;
      }

      if (attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    this.status.set('failed');
  }
}
