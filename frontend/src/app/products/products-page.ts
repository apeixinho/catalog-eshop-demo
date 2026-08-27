import { Component, effect, inject, signal, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Page, Product, ProductCategory } from '../shared/models';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';

const PAGE_SIZE = 8;

@Component({
  selector: 'app-products-page',
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
    <div class="catalog view-enter">
      <section class="filters page-shell">
        <div class="filter-row">
          <label class="search">
            <span class="sr-only">{{ i18n.t('catalog.search') }}</span>
            <input
              class="gallery-input"
              type="search"
              [(ngModel)]="search"
              (ngModelChange)="onSearchInput()"
              (keydown.enter)="onSearch()"
              [placeholder]="i18n.t('catalog.searchPlaceholder')"
            />
          </label>
          <label class="category">
            <span class="sr-only">{{ i18n.t('catalog.category') }}</span>
            <select
              class="gallery-select"
              [(ngModel)]="categoryId"
              (ngModelChange)="onCategoryChange()"
            >
              <option [ngValue]="null">{{ i18n.t('catalog.allCategories') }}</option>
              @for (category of categories(); track category.id) {
                <option [ngValue]="category.id">{{ category.categoryName }}</option>
              }
            </select>
          </label>
        </div>
      </section>

      <section class="grid-wrap page-shell">
        @if (error()) {
          <p class="empty">{{ error() }}</p>
        } @else if (products().length === 0) {
          <p class="empty">{{ i18n.t('catalog.empty') }}</p>
        } @else {
          <div class="grid">
            @for (product of products(); track product.id; let i = $index) {
              <article class="product animate-fade-up" [style.animation-delay.ms]="i * 70">
                <a
                  class="product-image-link"
                  [routerLink]="['/products', product.id]"
                  [attr.aria-label]="i18n.t('product.openDetail', { name: product.name })"
                >
                  <div class="product-image-wrap frame">
                    <img
                      class="animate-fade-in"
                      [src]="imageSrc(product.imageUrl)"
                      [alt]="product.name"
                      loading="lazy"
                    />
                  </div>
                </a>
                <div class="meta">
                  <h2>
                    <a class="title-link" [routerLink]="['/products', product.id]">{{
                      product.name
                    }}</a>
                  </h2>
                  @if (product.description) {
                    <div class="desc-wrap">
                      <p class="desc">{{ product.description }}</p>
                      <span class="desc-tooltip" role="tooltip">{{ product.description }}</span>
                    </div>
                  }
                  <div class="row">
                    <span class="price">{{
                      i18n.toDisplayMoney(product.unitPrice)
                        | currency
                          : i18n.currencyCode()
                          : 'symbol'
                          : '1.2-2'
                          : i18n.localeId()
                    }}</span>
                    <button class="quiet-btn add" type="button" (click)="add(product)">
                      {{ i18n.t('catalog.addToCart') }}
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>

          @if (totalPages() > 1) {
            <nav class="pagination" [attr.aria-label]="i18n.t('catalog.pages')">
              <button
                type="button"
                class="quiet-btn page-btn"
                [disabled]="pageIndex() === 0"
                (click)="goToPage(pageIndex() - 1)"
              >
                {{ i18n.t('catalog.previous') }}
              </button>
              <span class="page-status">
                <span class="mono">{{ pageIndex() + 1 }}</span>
                <span class="of">/</span>
                <span class="mono">{{ totalPages() }}</span>
              </span>
              <button
                type="button"
                class="quiet-btn page-btn"
                [disabled]="pageIndex() >= totalPages() - 1"
                (click)="goToPage(pageIndex() + 1)"
              >
                {{ i18n.t('catalog.next') }}
              </button>
            </nav>
          }
        }
      </section>
    </div>
  `,
  styles: `
    .filter-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-bottom: 0;
      padding-block: 1.5rem;
    }

    @media (min-width: 640px) {
      .filter-row {
        flex-direction: row;
        align-items: flex-end;
        gap: 2rem;
        padding-block: 2rem;
      }
    }

    .search {
      flex: 1;
    }

    .category {
      width: 100%;
    }

    @media (min-width: 640px) {
      .category {
        width: 12rem;
      }
    }

    .grid-wrap {
      padding-bottom: 5rem;
      padding-top: 2rem;
    }

    @media (min-width: 640px) {
      .grid-wrap {
        padding-bottom: 7rem;
        padding-top: 2.5rem;
      }
    }

    .empty {
      margin: 4rem 0;
      text-align: center;
      font-family: var(--font-display);
      font-size: 1.5rem;
      color: var(--muted);
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr;
      column-gap: 2rem;
      row-gap: 3.5rem;
      align-items: stretch;
    }

    @media (min-width: 640px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
        row-gap: 4rem;
      }
    }

    @media (min-width: 1024px) {
      .grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (min-width: 1280px) {
      .grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .product {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .product-image-link {
      display: block;
      text-decoration: none;
      color: inherit;
      margin-bottom: 1.25rem;
      outline: none;
    }

    .product-image-link:focus-visible .frame {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
    }

    .frame {
      aspect-ratio: 3 / 4;
      background: var(--surface);
      overflow: hidden;
      transition: transform 0.35s ease;
    }

    .product-image-link:hover .frame,
    .product-image-link:focus-visible .frame {
      transform: scale(1.02);
    }

    .frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: opacity 0.35s ease;
    }

    .product-image-link:hover img,
    .product-image-link:focus-visible img {
      opacity: 0.92;
    }

    .meta {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .meta h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 500;
      line-height: 1.25;
      letter-spacing: -0.02em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: calc(1.25em * 2);
    }

    .title-link {
      color: inherit;
      text-decoration: none;
    }

    .title-link:hover,
    .title-link:focus-visible {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    @media (min-width: 640px) {
      .meta h2 {
        font-size: 1.5rem;
        min-height: calc(1.25em * 2);
      }
    }

    .desc-wrap {
      position: relative;
      margin-top: 0.35rem;
    }

    .desc {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.4;
      color: var(--muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      cursor: help;
    }

    .desc-tooltip {
      position: absolute;
      left: 0;
      bottom: calc(100% + 0.5rem);
      z-index: 5;
      width: max(100%, 14rem);
      max-width: 20rem;
      padding: 0.65rem 0.75rem;
      background: var(--fg);
      color: var(--bg);
      font-size: 0.8rem;
      line-height: 1.45;
      opacity: 0;
      visibility: hidden;
      transform: translateY(4px);
      transition:
        opacity 0.2s ease,
        transform 0.2s ease,
        visibility 0.2s ease;
      pointer-events: none;
    }

    .desc-wrap:hover .desc-tooltip,
    .desc-wrap:focus-within .desc-tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: auto;
      padding-top: 0.75rem;
    }

    .price {
      font-family: var(--font-mono);
      font-size: 0.875rem;
    }

    .add {
      border-bottom: 1px solid transparent;
      padding-bottom: 0.125rem;
    }

    .add:hover {
      border-bottom-color: var(--accent);
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 3.5rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
    }

    .page-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .page-status {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
      font-size: 0.875rem;
      color: var(--muted);
    }

    .mono {
      font-family: var(--font-mono);
      color: var(--fg);
    }

    .of {
      opacity: 0.6;
    }
  `,
})
export class ProductsPage {
  private readonly api = inject(CatalogApiService);
  private readonly cart = inject(CartService);
  readonly i18n = inject(LocaleService);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<ProductCategory[]>([]);
  readonly pageIndex = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly error = signal<string | null>(null);

  search = '';
  categoryId: number | null = null;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  /** Bumped so slower responses cannot overwrite a newer catalog load. */
  private loadSeq = 0;

  constructor() {
    effect(() => {
      this.i18n.language();
      untracked(() => {
        this.api.getCategories().subscribe({
          next: (categories) => this.categories.set(categories),
          error: () => this.error.set(this.i18n.t('catalog.loadFailed')),
        });
        this.load();
      });
    });
  }

  onSearchInput(): void {
    if (this.searchDebounce != null) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => {
      this.pageIndex.set(0);
      this.load();
    }, 300);
  }

  onSearch(): void {
    if (this.searchDebounce != null) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
    this.pageIndex.set(0);
    this.load();
  }

  onCategoryChange(): void {
    this.pageIndex.set(0);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) {
      return;
    }
    this.pageIndex.set(page);
    this.load();
  }

  load(): void {
    const page = this.pageIndex();
    const query = this.search.trim();
    const seq = ++this.loadSeq;
    this.error.set(null);
    const request =
      query.length > 0
        ? this.api.searchByName(query, page, PAGE_SIZE, this.categoryId)
        : this.categoryId != null
          ? this.api.searchByCategory(this.categoryId, page, PAGE_SIZE)
          : this.api.getProducts(page, PAGE_SIZE);

    request.subscribe({
      next: (result) => {
        if (seq === this.loadSeq) {
          this.applyPage(result);
        }
      },
      error: () => {
        if (seq === this.loadSeq) {
          this.products.set([]);
          this.error.set(this.i18n.t('catalog.loadFailed'));
        }
      },
    });
  }

  add(product: Product): void {
    this.cart.addToCart(product);
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

  private applyPage(result: Page<Product>): void {
    this.products.set(result.content ?? []);
    const meta = result.page;
    this.pageIndex.set(meta?.number ?? result.number ?? 0);
    this.totalPages.set(meta?.totalPages ?? result.totalPages ?? 0);
    this.totalElements.set(meta?.totalElements ?? result.totalElements ?? 0);
  }
}
