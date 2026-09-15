import {
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Page, Product, ProductCategory } from '../shared/models';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';

const PAGE_SIZE = 8;
const HERO_AUTOPLAY_MS = 5500;

/** Curated product shots already shipped under /assets/images/products. */
const HERO_SLIDES = [
  '/assets/images/products/coffeemugs/coffeemug-luv2code-1001.png',
  '/assets/images/products/books/book-luv2code-1005.png',
  '/assets/images/products/mousepads/mousepad-luv2code-1003.png',
  '/assets/images/products/luggagetags/luggagetag-luv2code-1012.png',
  '/assets/images/products/coffeemugs/coffeemug-luv2code-1016.png',
  '/assets/images/products/books/book-luv2code-1018.png',
  '/assets/images/products/mousepads/mousepad-luv2code-1015.png',
  '/assets/images/products/luggagetags/luggagetag-luv2code-1007.png',
] as const;

@Component({
  selector: 'app-products-page',
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatIconModule,
    MatPaginatorModule,
  ],
  template: `
    <div class="catalog view-enter">
      <section class="hero" aria-labelledby="hero-brand">
        <div class="hero-layout page-shell">
          <div class="hero-content">
            <p id="hero-brand" class="hero-brand brand-type">{{ i18n.t('nav.catalog') }}</p>
            <h1 class="hero-headline">{{ i18n.t('hero.headline') }}</h1>
            <p class="hero-lead">{{ i18n.t('hero.lead') }}</p>
            <div class="hero-actions">
              <a mat-flat-button color="primary" class="hero-cta" href="#market">
                {{ i18n.t('hero.cta') }}
              </a>
            </div>
          </div>

          <div
            class="hero-stage"
            role="region"
            [attr.aria-roledescription]="'carousel'"
            [attr.aria-label]="i18n.t('hero.slideshow')"
            (mouseenter)="pauseHero()"
            (mouseleave)="resumeHero()"
            (focusin)="pauseHero()"
            (focusout)="onHeroFocusOut($event)"
          >
            <button
              mat-icon-button
              type="button"
              class="hero-arrow hero-arrow-prev"
              [attr.aria-label]="i18n.t('hero.previousSlide')"
              (click)="prevHero()"
            >
              <mat-icon>chevron_left</mat-icon>
            </button>

            <div class="hero-slides">
              @for (src of heroSlides; track src; let i = $index) {
                <div
                  class="hero-slide"
                  [class.active]="heroIndex() === i"
                  [attr.aria-hidden]="heroIndex() !== i"
                >
                  <img
                    [src]="src"
                    alt=""
                    [attr.fetchpriority]="i === 0 ? 'high' : 'low'"
                    [attr.loading]="i === 0 ? 'eager' : 'lazy'"
                  />
                </div>
              }
            </div>

            <button
              mat-icon-button
              type="button"
              class="hero-arrow hero-arrow-next"
              [attr.aria-label]="i18n.t('hero.nextSlide')"
              (click)="nextHero()"
            >
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        </div>
      </section>

      <section id="market" class="market">
        <div class="filters page-shell">
          <div class="section-head">
            <div>
              <p class="eyebrow">{{ i18n.t('catalog.marketEyebrow') }}</p>
              <h2>{{ i18n.t('catalog.marketTitle') }}</h2>
            </div>
          </div>
          <div class="filter-row">
            <mat-form-field class="search" appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ i18n.t('catalog.search') }}</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input
                matInput
                type="search"
                [(ngModel)]="search"
                (ngModelChange)="onSearchInput()"
                (keydown.enter)="onSearch()"
                [placeholder]="i18n.t('catalog.searchPlaceholder')"
              />
            </mat-form-field>
            <mat-form-field class="category" appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ i18n.t('catalog.category') }}</mat-label>
              <mat-select [(ngModel)]="categoryId" (ngModelChange)="onCategoryChange()">
                <mat-option [value]="null">{{ i18n.t('catalog.allCategories') }}</mat-option>
                @for (category of categories(); track category.id) {
                  <mat-option [value]="category.id">{{ category.categoryName }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <section class="grid-wrap page-shell">
          @if (error()) {
            <p class="empty muted">{{ error() }}</p>
          } @else if (products().length === 0) {
            <p class="empty muted">{{ i18n.t('catalog.empty') }}</p>
          } @else {
            <div class="grid">
              @for (product of products(); track product.id; let i = $index) {
                <mat-card class="product" [style.--stagger]="i">
                  <a
                    class="product-image-link"
                    [routerLink]="['/products', product.id]"
                    [attr.aria-label]="i18n.t('product.openDetail', { name: product.name })"
                  >
                    <div class="product-image-wrap frame">
                      <img
                        [src]="imageSrc(product.imageUrl)"
                        [alt]="product.name"
                        loading="lazy"
                      />
                    </div>
                  </a>
                  <mat-card-content class="meta">
                    <h3>
                      <a class="title-link" [routerLink]="['/products', product.id]">{{
                        product.name
                      }}</a>
                    </h3>
                    @if (product.description) {
                      <p class="desc muted" [matTooltip]="product.description">
                        {{ product.description }}
                      </p>
                    }
                    <div class="row">
                      <span class="price mono">{{
                        i18n.toDisplayMoney(product.unitPrice)
                          | currency
                            : i18n.currencyCode()
                            : 'symbol'
                            : '1.2-2'
                            : i18n.localeId()
                      }}</span>
                      <button
                        mat-flat-button
                        color="primary"
                        class="add-btn"
                        type="button"
                        (click)="add(product)"
                      >
                        {{ i18n.t('catalog.addToCart') }}
                      </button>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>

            @if (totalElements() > PAGE_SIZE) {
              <mat-paginator
                [length]="totalElements()"
                [pageIndex]="pageIndex()"
                [pageSize]="PAGE_SIZE"
                [hidePageSize]="true"
                [attr.aria-label]="i18n.t('catalog.pages')"
                (page)="onPage($event)"
              />
            }
          }
        </section>
      </section>
    </div>
  `,
  styles: `
    .hero {
      position: relative;
      z-index: 1;
      isolation: isolate;
      min-height: min(62dvh, 32rem);
      overflow: hidden;
      color: #f7faf7;
      background:
        radial-gradient(ellipse 55% 70% at 72% 48%, rgb(40 55 48 / 45%), transparent 70%),
        #0c1210;
    }

    .hero-layout {
      min-height: inherit;
      display: grid;
      gap: 1.25rem;
      align-items: center;
      padding-block: 2.75rem 2.25rem;
    }

    @media (min-width: 900px) {
      .hero-layout {
        grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
        gap: 1.5rem;
        padding-block: 3.25rem 2.75rem;
      }
    }

    .hero-content {
      position: relative;
      z-index: 1;
      max-width: 36rem;
    }

    .hero-stage {
      position: relative;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.25rem;
      min-height: 14rem;
      outline: none;
    }

    @media (min-width: 900px) {
      .hero-stage {
        min-height: 22rem;
      }
    }

    .hero-slides {
      position: relative;
      width: 100%;
      min-height: 14rem;
    }

    @media (min-width: 900px) {
      .hero-slides {
        min-height: 22rem;
      }
    }

    .hero-slide {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      opacity: 0;
      transform: scale(0.98);
      transition:
        opacity 0.55s var(--catalog-ease-out),
        transform 0.7s var(--catalog-ease-out);
      pointer-events: none;
    }

    .hero-slide.active {
      opacity: 1;
      transform: scale(1);
    }

    .hero-slide img {
      width: min(100%, 22rem);
      height: 100%;
      max-height: 22rem;
      object-fit: contain;
      object-position: center;
      filter: drop-shadow(0 18px 40px rgb(0 0 0 / 35%));
    }

    .hero-arrow {
      z-index: 2;
      color: #f7faf7 !important;
      background: rgb(255 255 255 / 10%) !important;
      backdrop-filter: blur(8px);
      border: 1px solid rgb(255 255 255 / 16%);
    }

    .hero-arrow:hover {
      background: rgb(255 255 255 / 18%) !important;
    }

    .hero-brand {
      margin: 0 0 1rem;
      font-size: clamp(2.75rem, 8vw, 5.25rem);
      font-weight: 800;
      letter-spacing: -0.055em;
      line-height: 0.92;
      text-shadow: 0 8px 28px rgb(0 0 0 / 28%);
    }

    .hero-headline {
      margin: 0;
      max-width: 16ch;
      font-size: clamp(1.35rem, 3.2vw, 2rem);
      font-weight: 650;
      letter-spacing: -0.03em;
      line-height: 1.2;
    }

    .hero-lead {
      margin: 1rem 0 0;
      max-width: 34rem;
      font-family: var(--catalog-font-body);
      font-size: 1.05rem;
      line-height: 1.55;
      color: rgb(247 250 247 / 86%);
    }

    .hero-actions {
      margin-top: 1.75rem;
    }

    .hero-cta {
      min-height: 2.85rem;
      padding-inline: 1.4rem !important;
      box-shadow: var(--catalog-shadow-md);
    }

    .market {
      position: relative;
      z-index: 0;
      margin-top: -1.25rem;
      padding-top: 0.25rem;
      border-radius: var(--catalog-radius-lg) var(--catalog-radius-lg) 0 0;
      background: color-mix(in srgb, var(--mat-sys-surface) 94%, white);
      box-shadow: 0 -12px 40px rgb(16 24 20 / 8%);
    }

    .section-head {
      padding-top: 2.25rem;
    }

    .section-head h2 {
      margin: 0;
      font-size: clamp(1.5rem, 2.5vw, 2rem);
      font-weight: 700;
      letter-spacing: -0.035em;
    }

    .filter-row {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-block: 1.25rem 0.5rem;
    }

    @media (min-width: 640px) {
      .filter-row {
        flex-direction: row;
        align-items: flex-start;
        gap: 1rem;
      }
    }

    .search {
      flex: 1;
      width: 100%;
    }

    .category {
      width: 100%;
    }

    @media (min-width: 640px) {
      .category {
        width: 15rem;
      }
    }

    .grid-wrap {
      padding-bottom: 5rem;
      padding-top: 1rem;
    }

    .empty {
      margin: 4rem 0;
      text-align: center;
      font: var(--mat-sys-headline-small);
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    @media (min-width: 640px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
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
      overflow: hidden;
      transition:
        transform 0.35s var(--catalog-ease-out),
        box-shadow 0.35s var(--catalog-ease-out),
        border-color 0.35s var(--catalog-ease-out);
      animation: fade-up 0.5s var(--catalog-ease-out) both;
      animation-delay: calc(var(--stagger) * 40ms);
    }

    .product:hover {
      transform: translateY(-4px);
      box-shadow: var(--catalog-shadow-md) !important;
      border-color: color-mix(in srgb, var(--mat-sys-primary) 28%, var(--mat-sys-outline-variant));
    }

    .product:hover .frame img {
      transform: scale(1.05);
    }

    .product-image-link {
      display: block;
      text-decoration: none;
      color: inherit;
    }

    .frame {
      aspect-ratio: 4 / 5;
      border-radius: 0 !important;
      background:
        linear-gradient(180deg, var(--catalog-surface-mist), color-mix(in srgb, var(--mat-sys-surface-container) 80%, white));
    }

    .meta {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 1rem 1rem 1.15rem !important;
      gap: 0.35rem;
    }

    .meta h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 650;
      letter-spacing: -0.025em;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .title-link {
      color: inherit;
      text-decoration: none;
    }

    .title-link:hover {
      color: var(--mat-sys-primary);
    }

    .desc {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: auto;
      padding-top: 0.85rem;
    }

    .price {
      font-family: var(--catalog-font-display);
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .add-btn {
      min-height: 2.35rem !important;
      font-size: 0.8rem !important;
      padding-inline: 0.9rem !important;
    }

    mat-paginator {
      margin-top: 2rem;
    }

    @media (prefers-reduced-motion: reduce) {
      .product,
      .hero-slide {
        animation: none !important;
        transition: none !important;
      }

      .product:hover {
        transform: none;
      }
    }
  `,
})
export class ProductsPage {
  readonly PAGE_SIZE = PAGE_SIZE;
  readonly heroSlides = HERO_SLIDES;

  private readonly api = inject(CatalogApiService);
  private readonly cart = inject(CartService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(LocaleService);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<ProductCategory[]>([]);
  readonly pageIndex = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly error = signal<string | null>(null);
  readonly heroIndex = signal(0);

  search = '';
  categoryId: number | null = null;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private loadSeq = 0;
  private heroTimer: ReturnType<typeof setInterval> | null = null;
  private heroPaused = false;
  private readonly prefersReducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    this.startHeroAutoplay();
    this.destroyRef.onDestroy(() => this.stopHeroAutoplay());
  }

  prevHero(): void {
    this.goToHero(this.heroIndex() - 1);
  }

  nextHero(): void {
    this.goToHero(this.heroIndex() + 1);
  }

  goToHero(index: number): void {
    const total = this.heroSlides.length;
    const next = ((index % total) + total) % total;
    this.heroIndex.set(next);
    this.restartHeroAutoplay();
  }

  pauseHero(): void {
    this.heroPaused = true;
    this.stopHeroAutoplay();
  }

  resumeHero(): void {
    this.heroPaused = false;
    this.startHeroAutoplay();
  }

  onHeroFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && (event.currentTarget as Node).contains(next)) {
      return;
    }
    this.resumeHero();
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

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
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

  private startHeroAutoplay(): void {
    if (this.prefersReducedMotion || this.heroPaused || this.heroTimer != null) {
      return;
    }
    this.heroTimer = setInterval(() => {
      this.heroIndex.update((i) => (i + 1) % this.heroSlides.length);
    }, HERO_AUTOPLAY_MS);
  }

  private stopHeroAutoplay(): void {
    if (this.heroTimer != null) {
      clearInterval(this.heroTimer);
      this.heroTimer = null;
    }
  }

  private restartHeroAutoplay(): void {
    this.stopHeroAutoplay();
    this.startHeroAutoplay();
  }
}
