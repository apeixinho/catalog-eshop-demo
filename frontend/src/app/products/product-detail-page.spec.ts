import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, convertToParamMap, ActivatedRoute, ParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ProductDetailPage } from './product-detail-page';
import { CatalogApiService } from '../shared/catalog-api.service';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';
import { Product } from '../shared/models';

describe('ProductDetailPage', () => {
  let fixture: ComponentFixture<ProductDetailPage>;
  let component: ProductDetailPage;
  let api: { getProduct: ReturnType<typeof vi.fn> };
  let cart: { addToCart: ReturnType<typeof vi.fn> };
  let paramMap$: BehaviorSubject<ParamMap>;

  const product: Product = {
    id: 7,
    sku: 'SKU-7',
    name: 'Widget',
    description: 'A widget',
    unitPrice: 25,
    imageUrl: 'widget.png',
    active: true,
    unitsInStock: 3,
    category: { id: 1, categoryName: 'Gadgets' },
  };

  const localeMock = {
    t: (key: string) => key,
    language: () => 'en',
    currencyCode: () => 'USD',
    localeId: () => 'en-US',
    toDisplayMoney: (amount: number) => amount,
  };

  function routeProvider(id: string, stream: BehaviorSubject<ParamMap>) {
    const map = convertToParamMap({ id });
    return {
      paramMap: stream.asObservable(),
      snapshot: { paramMap: map },
    };
  }

  async function setup(id: string): Promise<void> {
    paramMap$ = new BehaviorSubject(convertToParamMap({ id }));
    api = {
      getProduct: vi.fn().mockReturnValue(of(product)),
    };
    cart = { addToCart: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ProductDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeProvider(id, paramMap$) },
        { provide: CatalogApiService, useValue: api },
        { provide: CartService, useValue: cart },
        { provide: LocaleService, useValue: localeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('loads product detail for route id', async () => {
    await setup('7');

    expect(api.getProduct).toHaveBeenCalledWith(7);
    expect(component.product()?.name).toBe('Widget');
    expect(component.inStock()).toBe(true);
  });

  it('marks out-of-stock when units are zero', async () => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ id: '7' }));
    api = {
      getProduct: vi.fn().mockReturnValue(of({ ...product, unitsInStock: 0 })),
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeProvider('7', paramMap$) },
        { provide: CatalogApiService, useValue: api },
        { provide: CartService, useValue: { addToCart: vi.fn() } },
        { provide: LocaleService, useValue: localeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.inStock()).toBe(false);
  });

  it('shows not found for invalid id without calling API', async () => {
    await setup('not-a-number');

    expect(api.getProduct).not.toHaveBeenCalled();
    expect(component.error()).toBe('product.notFound');
  });

  it('shows not found when API fails', async () => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ id: '7' }));
    api = {
      getProduct: vi.fn().mockReturnValue(throwError(() => new Error('404'))),
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeProvider('7', paramMap$) },
        { provide: CatalogApiService, useValue: api },
        { provide: CartService, useValue: { addToCart: vi.fn() } },
        { provide: LocaleService, useValue: localeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.error()).toBe('product.notFound');
  });

  it('adds loaded product to cart', async () => {
    await setup('7');
    component.add();
    expect(cart.addToCart).toHaveBeenCalledWith(product);
  });

  it('reloads when route id changes', async () => {
    await setup('7');
    api.getProduct.mockClear();
    api.getProduct.mockReturnValue(of({ ...product, id: 8, name: 'Other' }));

    paramMap$.next(convertToParamMap({ id: '8' }));
    await fixture.whenStable();

    expect(api.getProduct).toHaveBeenCalledWith(8);
    expect(component.product()?.name).toBe('Other');
  });
});
