import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Country, CustomerDetail, CustomerSummary, CustomerUpsert, OrderDetail, OrderStatus, OrderSummary, Page, Product, ProductCategory, State } from './models';
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
  ): Observable<{ orderTrackingNumber: string; status: OrderStatus }> {
    return this.http.get<{ orderTrackingNumber: string; status: OrderStatus }>(
      `${this.base}/checkout/orders/${encodeURIComponent(trackingNumber)}`,
    );
  }

  listMyOrders(page = 0, size = 20): Observable<Page<OrderSummary>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<OrderSummary>>(`${this.base}/account/orders`, { params });
  }

  getMyOrder(trackingNumber: string): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(
      `${this.base}/account/orders/${encodeURIComponent(trackingNumber)}`,
    );
  }

  listManageOrders(page = 0, size = 20): Observable<Page<OrderSummary>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<OrderSummary>>(`${this.base}/manage/orders`, { params });
  }

  getManageOrder(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.base}/manage/orders/${id}`);
  }

  updateManageOrder(id: number, status: OrderStatus): Observable<OrderDetail> {
    return this.http.put<OrderDetail>(`${this.base}/manage/orders/${id}`, { status });
  }

  deleteManageOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/manage/orders/${id}`);
  }

  listManageCustomers(page = 0, size = 20): Observable<Page<CustomerSummary>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<CustomerSummary>>(`${this.base}/manage/customers`, { params });
  }

  getManageCustomer(id: number): Observable<CustomerDetail> {
    return this.http.get<CustomerDetail>(`${this.base}/manage/customers/${id}`);
  }

  createAdminCustomer(body: CustomerUpsert): Observable<CustomerSummary> {
    return this.http.post<CustomerSummary>(`${this.base}/admin/customers`, body);
  }

  updateAdminCustomer(id: number, body: CustomerUpsert): Observable<CustomerSummary> {
    return this.http.put<CustomerSummary>(`${this.base}/admin/customers/${id}`, body);
  }

  deleteAdminCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/customers/${id}`);
  }

  private withLang(params: HttpParams): HttpParams {
    return params.set('lang', this.i18n.language());
  }
}
