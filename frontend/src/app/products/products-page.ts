import { Component, effect, inject, signal, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CatalogApiService } from '../shared/catalog-api.service';
import { Page, Product, ProductCategory } from '../shared/models';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';

const PAGE_SIZE = 8;

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
    MatPaginatorModule,
  ],
  template: `
    <div class="catalog view-enter">
      <section class="filters page-shell">
        <div class="filter-row">
          <mat-form-field class="search" subscriptSizing="dynamic">
            <mat-label>{{ i18n.t('catalog.search') }}</mat-label>
            <input
              matInput
              type="search"
              [(ngModel)]="search"
              (ngModelChange)="onSearchInput()"
              (keydown.enter)="onSearch()"
              [placeholder]="i18n.t('catalog.searchPlaceholder')"
            />
          </mat-form-field>
          <mat-form-field class="category" subscriptSizing="dynamic">
            <mat-label>{{ i18n.t('catalog.category') }}</mat-label>
            <mat-select [(ngModel)]="categoryId" (ngModelChange)="onCategoryChange()">
              <mat-option [value]="null">{{ i18n.t('catalog.allCategories') }}</mat-option>
              @for (category of categories(); track category.id) {
                <mat-option [value]="category.id">{{ category.categoryName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </section>

      <section class="grid-wrap page-shell">
        @if (error()) {
          <p class="empty muted">{{ error() }}</p>
        } @else if (products().length === 0) {
          <p class="empty muted">{{ i18n.t('catalog.empty') }}</p>
        } @else {
          <div class="grid">
            @for (product of products(); track product.id) {
              <mat-card class="product">
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
                  <h2>
                    <a class="title-link" [routerLink]="['/products', product.id]">{{
                      product.name
                    }}</a>
                  </h2>
                  @if (product.description) {
                    <p class="desc muted" [matTooltip]="product.description">{{ product.description }}</p>
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
                    <button mat-button type="button" (click)="add(product)">
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
    </div>
  `,
  styles: `
    .filter-row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-block: 1.5rem;
    }

    @media (min-width: 640px) {
      .filter-row {
        flex-direction: row;
        align-items: flex-start;
        gap: 1rem;
        padding-block: 2rem;
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
        width: 14rem;
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
      gap: 1.5rem;
    }

    @media (min-width: 640px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
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
    }

    .frame {
      aspect-ratio: 3 / 4;
      background: var(--mat-sys-surface-container);
    }

    .meta {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding-top: 1rem !important;
    }

    .meta h2 {
      margin: 0;
      font: var(--mat-sys-title-medium);
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
      margin: 0.35rem 0 0;
      font: var(--mat-sys-body-small);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: auto;
      padding-top: 0.75rem;
    }

    mat-paginator {
      margin-top: 2rem;
    }
  `,
})
export class ProductsPage {
  readonly PAGE_SIZE = PAGE_SIZE;

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
}
