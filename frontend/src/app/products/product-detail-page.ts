import { Component, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Product } from '../shared/models';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'app-product-detail-page',
  imports: [CurrencyPipe, RouterLink],
  template: `
    <section class="detail view-enter page-shell">
      <a routerLink="/products" class="back quiet-btn">{{ i18n.t('product.back') }}</a>

      @if (error()) {
        <p class="status">{{ error() }}</p>
      } @else if (!product()) {
        <p class="status">{{ i18n.t('product.loading') }}</p>
      } @else {
        <div class="layout">
          <div class="media frame">
            <img
              class="animate-fade-in"
              [src]="imageSrc(product()!.imageUrl)"
              [alt]="product()!.name"
            />
          </div>

          <div class="info">
            @if (product()!.category?.categoryName) {
              <p class="eyebrow">{{ product()!.category!.categoryName }}</p>
            }
            <h1>{{ product()!.name }}</h1>
            <p class="sku mono">{{ i18n.t('product.sku') }}: {{ product()!.sku }}</p>

            <p class="price">
              {{
                i18n.toDisplayMoney(product()!.unitPrice)
                  | currency
                    : i18n.currencyCode()
                    : 'symbol'
                    : '1.2-2'
                    : i18n.localeId()
              }}
            </p>

            @if (product()!.description) {
              <p class="description">{{ product()!.description }}</p>
            }

            <p class="stock" [class.stock--out]="!inStock()">
              {{
                inStock()
                  ? i18n.t('product.inStock', { count: product()!.unitsInStock })
                  : i18n.t('product.outOfStock')
              }}
            </p>

            <button
              type="button"
              class="quiet-btn quiet-btn--solid add"
              [disabled]="!inStock()"
              (click)="add()"
            >
              {{ i18n.t('catalog.addToCart') }}
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .detail {
      padding-block: 2rem 5rem;
    }

    @media (min-width: 640px) {
      .detail {
        padding-block: 2.5rem 7rem;
      }
    }

    .back {
      display: inline-block;
      margin-bottom: 2rem;
      text-decoration: none;
      color: var(--muted);
      border-bottom: 1px solid transparent;
      padding-bottom: 0.125rem;
    }

    .back:hover,
    .back:focus-visible {
      color: var(--fg);
      border-bottom-color: var(--accent);
    }

    .status {
      margin: 4rem 0;
      text-align: center;
      font-family: var(--font-display);
      font-size: 1.5rem;
      color: var(--muted);
    }

    .layout {
      display: grid;
      gap: 2.5rem;
      align-items: start;
    }

    @media (min-width: 900px) {
      .layout {
        grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
        gap: 4rem;
      }
    }

    .frame {
      aspect-ratio: 3 / 4;
      background: var(--surface);
      max-width: 28rem;
      margin-inline: auto;
      width: 100%;
    }

    @media (min-width: 900px) {
      .frame {
        margin-inline: 0;
        max-width: none;
      }
    }

    .frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 36rem;
    }

    .eyebrow {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    h1 {
      margin: 0;
      font-family: var(--font-display);
      font-weight: 500;
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 1.15;
      letter-spacing: -0.02em;
    }

    .sku {
      margin: 0.75rem 0 0;
      font-size: 0.8rem;
      color: var(--muted);
    }

    .mono {
      font-family: var(--font-mono);
    }

    .price {
      margin: 1.5rem 0 0;
      font-family: var(--font-mono);
      font-size: 1.25rem;
    }

    .description {
      margin: 1.5rem 0 0;
      font-size: 1rem;
      line-height: 1.65;
      color: var(--muted);
      white-space: pre-wrap;
    }

    .stock {
      margin: 1.25rem 0 0;
      font-size: 0.875rem;
      color: var(--fg);
    }

    .stock--out {
      color: var(--danger);
    }

    .add {
      margin-top: 2rem;
      text-decoration: none;
    }

    .add:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `,
})
export class ProductDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CatalogApiService);
  private readonly cart = inject(CartService);
  readonly i18n = inject(LocaleService);

  private readonly productId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: this.route.snapshot.paramMap.get('id') },
  );

  readonly product = signal<Product | null>(null);
  readonly error = signal<string | null>(null);
  readonly inStock = signal(false);

  private loadSeq = 0;

  constructor() {
    effect(() => {
      this.i18n.language();
      const idParam = this.productId();
      untracked(() => this.load(idParam));
    });
  }

  add(): void {
    const product = this.product();
    if (product) {
      this.cart.addToCart(product);
    }
  }

  imageSrc(url: string | null | undefined): string {
    if (!url) {
      return '/assets/images/products/placeholder.png';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url;
    }
    return `/${url}`;
  }

  private load(idParam: string | null): void {
    const id = Number(idParam);
    if (!Number.isFinite(id) || id <= 0) {
      this.product.set(null);
      this.error.set(this.i18n.t('product.notFound'));
      return;
    }

    const seq = ++this.loadSeq;
    this.error.set(null);
    this.api.getProduct(id).subscribe({
      next: (product) => {
        if (seq !== this.loadSeq) {
          return;
        }
        this.product.set(product);
        this.inStock.set(product.active && product.unitsInStock > 0);
      },
      error: () => {
        if (seq !== this.loadSeq) {
          return;
        }
        this.product.set(null);
        this.error.set(this.i18n.t('product.notFound'));
      },
    });
  }
}
