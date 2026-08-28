import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Country, Page, Product, ProductCategory, State } from './models';
import { environment } from '../../environments/environment';
import { LocaleService } from '../i18n/locale.service';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(LocaleService);
  private readonly base = `${environment.apiBaseUrl}/api/v1`;

  getProducts(page = 0, size = 8): Observable<Page<Product>> {
    const params = this.withLang(new HttpParams().set('page', page).set('size', size));
    return this.http.get<Page<Product>>(`${this.base}/products`, { params });
  }

  getProduct(id: number): Observable<Product> {
    const params = this.withLang(new HttpParams());
    return this.http.get<Product>(`${this.base}/products/${id}`, { params });
  }

  searchByName(
    name: string,
    page = 0,
    size = 8,
    categoryId?: number | null,
  ): Observable<Page<Product>> {
    let params = this.withLang(
      new HttpParams().set('name', name).set('page', page).set('size', size),
    );
    if (categoryId != null) {
      params = params.set('categoryId', categoryId);
    }
    return this.http.get<Page<Product>>(`${this.base}/products/search/findByNameContaining`, {
      params,
    });
  }

  searchByCategory(id: number, page = 0, size = 8): Observable<Page<Product>> {
    const params = this.withLang(
      new HttpParams().set('id', id).set('page', page).set('size', size),
    );
    return this.http.get<Page<Product>>(`${this.base}/products/search/findByCategoryId`, {
      params,
    });
  }

  getCategories(): Observable<ProductCategory[]> {
    const params = this.withLang(new HttpParams());
    return this.http.get<ProductCategory[]>(`${this.base}/product-category`, { params });
  }

  getCountries(): Observable<Country[]> {
    const params = this.withLang(new HttpParams());
    return this.http.get<Country[]>(`${this.base}/countries`, { params });
  }

  getStates(countryCode: string): Observable<State[]> {
    const params = this.withLang(new HttpParams().set('code', countryCode));
    return this.http.get<State[]>(`${this.base}/states/search/findByCountryCode`, { params });
  }

  getCurrencyRates(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.base}/currency/rates`);
  }

  purchase(
    body: unknown,
    idempotencyKey: string,
  ): Observable<{ orderTrackingNumber: string; paymentUrl: string }> {
    return this.http.post<{ orderTrackingNumber: string; paymentUrl: string }>(
      `${this.base}/checkout/purchase`,
      body,
      {
        headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
      },
    );
  }

  getOrderStatus(
    trackingNumber: string,
  ): Observable<{ orderTrackingNumber: string; status: 'PENDING' | 'PAID' | 'CANCELLED' }> {
    return this.http.get<{ orderTrackingNumber: string; status: 'PENDING' | 'PAID' | 'CANCELLED' }>(
      `${this.base}/checkout/orders/${encodeURIComponent(trackingNumber)}`,
    );
  }

  private withLang(params: HttpParams): HttpParams {
    return params.set('lang', this.i18n.language());
  }
}
