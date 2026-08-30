import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ProductsPage } from './products-page';
import { CatalogApiService } from '../shared/catalog-api.service';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';
import { Product } from '../shared/models';

describe('ProductsPage', () => {
  let fixture: ComponentFixture<ProductsPage>;
  let component: ProductsPage;
  let api: {
    getProducts: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
    searchByName: ReturnType<typeof vi.fn>;
    searchByCategory: ReturnType<typeof vi.fn>;
  };
  let cart: { addToCart: ReturnType<typeof vi.fn> };

  const sampleProduct: Product = {
    id: 1,
    sku: 'SKU-1',
    name: 'Book',
    description: 'A book',
    unitPrice: 10,
    imageUrl: 'img/book.png',
    active: true,
    unitsInStock: 5,
  };

  const localeMock = {
    t: (key: string) => key,
    language: () => 'en',
    currencyCode: () => 'USD',
    localeId: () => 'en-US',
    toDisplayMoney: (amount: number) => amount,
    lineTotal: (price: number, qty: number) => price * qty,
  };

  beforeEach(async () => {
    api = {
      getProducts: vi.fn().mockReturnValue(
        of({
          content: [sampleProduct],
          number: 0,
          totalPages: 2,
          totalElements: 10,
        }),
      ),
      getCategories: vi.fn().mockReturnValue(of([{ id: 2, categoryName: 'Books' }])),
      searchByName: vi.fn().mockReturnValue(of({ content: [sampleProduct], totalPages: 1 })),
      searchByCategory: vi.fn().mockReturnValue(of({ content: [sampleProduct], totalPages: 1 })),
    };
    cart = { addToCart: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [
        provideRouter([]),
        { provide: CatalogApiService, useValue: api },
        { provide: CartService, useValue: cart },
        { provide: LocaleService, useValue: localeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads categories and products on init', () => {
    expect(api.getCategories).toHaveBeenCalled();
    expect(api.getProducts).toHaveBeenCalledWith(0, 8);
    expect(component.products()).toEqual([sampleProduct]);
    expect(component.totalPages()).toBe(2);
  });

  it('searches by name when query is set', () => {
    api.getProducts.mockClear();
    component.search = 'book';
    component.onSearch();

    expect(component.pageIndex()).toBe(0);
    expect(api.searchByName).toHaveBeenCalledWith('book', 0, 8, null);
    expect(api.getProducts).not.toHaveBeenCalled();
  });

  it('loads by category when categoryId is set', () => {
    api.getProducts.mockClear();
    component.categoryId = 2;
    component.onCategoryChange();

    expect(api.searchByCategory).toHaveBeenCalledWith(2, 0, 8);
    expect(api.getProducts).not.toHaveBeenCalled();
  });

  it('ignores out-of-range pagination', () => {
    component.totalPages.set(2);
    component.pageIndex.set(0);
    api.getProducts.mockClear();

    component.goToPage(-1);
    component.goToPage(99);

    expect(api.getProducts).not.toHaveBeenCalled();
    expect(component.pageIndex()).toBe(0);
  });

  it('sets error when catalog load fails', () => {
    api.getProducts.mockReturnValue(throwError(() => new Error('network')));
    component.load();

    expect(component.products()).toEqual([]);
    expect(component.error()).toBe('catalog.loadFailed');
  });

  it('adds product to cart', () => {
    component.add(sampleProduct);
    expect(cart.addToCart).toHaveBeenCalledWith(sampleProduct);
  });

  it('normalizes image URLs', () => {
    expect(component.imageSrc(null)).toBe('/assets/images/products/placeholder.png');
    expect(component.imageSrc('/img.png')).toBe('/img.png');
    expect(component.imageSrc('img.png')).toBe('/img.png');
    expect(component.imageSrc('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
  });
});
