import { Component, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { map } from 'rxjs/operators';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Product } from '../shared/models';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'app-product-detail-page',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatCardModule, MatChipsModule],
  template: `
    <section class="detail view-enter page-shell">
      <a mat-button class="back" routerLink="/products">{{ i18n.t('product.back') }}</a>

      @if (error()) {
        <p class="status muted">{{ error() }}</p>
      } @else if (!product()) {
        <p class="status muted">{{ i18n.t('product.loading') }}</p>
      } @else {
        <div class="layout">
          <div class="media frame product-image-wrap">
            <img
              class="animate-fade-in"
              [src]="imageSrc(product()!.imageUrl)"
              [alt]="product()!.name"
            />
          </div>

          <mat-card class="info">
            <mat-card-content>
              @if (product()!.category?.categoryName) {
                <mat-chip-set>
                  <mat-chip>{{ product()!.category!.categoryName }}</mat-chip>
                </mat-chip-set>
              }
              <h1>{{ product()!.name }}</h1>
              <p class="sku mono">{{ i18n.t('product.sku') }}: {{ product()!.sku }}</p>

              <p class="price mono">
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
                <p class="description muted">{{ product()!.description }}</p>
              }

              <mat-chip-set>
                <mat-chip [highlighted]="inStock()">
                  {{
                    inStock()
                      ? i18n.t('product.inStock', { count: product()!.unitsInStock })
                      : i18n.t('product.outOfStock')
                  }}
                </mat-chip>
              </mat-chip-set>

              <button
                mat-flat-button
                color="primary"
                class="add"
                type="button"
                [disabled]="!inStock()"
                (click)="add()"
              >
                {{ i18n.t('catalog.addToCart') }}
              </button>
            </mat-card-content>
          </mat-card>
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
      margin-bottom: 2rem;
    }

    .status {
      margin: 4rem 0;
      text-align: center;
      font: var(--mat-sys-headline-small);
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
      background: var(--mat-sys-surface-container);
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

    .info mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 36rem;
    }

    mat-chip-set {
      margin-bottom: 0.75rem;
    }

    h1 {
      margin: 0;
      font: var(--mat-sys-display-small);
      line-height: 1.15;
    }

    .sku {
      margin: 0.75rem 0 0;
      font: var(--mat-sys-body-small);
    }

    .price {
      margin: 1.5rem 0 0;
      font: var(--mat-sys-title-large);
    }

    .description {
      margin: 1.5rem 0 0;
      font: var(--mat-sys-body-large);
      line-height: 1.65;
      white-space: pre-wrap;
    }

    .add {
      margin-top: 2rem;
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
