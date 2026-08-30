import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { vi } from 'vitest';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: {
    ensureValidAccessToken: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    auth = {
      ensureValidAccessToken: vi.fn(),
      login: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('passes through non-catalog API requests unchanged', async () => {
    auth.ensureValidAccessToken.mockResolvedValue('token');

    const promise = firstValueFrom(http.get('https://example.com/data'));
    await Promise.resolve();
    const req = httpMock.expectOne('https://example.com/data');

    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await promise;
  });

  it('adds Authorization for catalog API when a token is available', async () => {
    auth.ensureValidAccessToken.mockResolvedValue('access-token');

    const promise = firstValueFrom(
      http.get(`${environment.apiBaseUrl}/api/v1/account/orders`),
    );
    await Promise.resolve();
    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/account/orders`,
    );

    expect(req.request.headers.get('Authorization')).toBe('Bearer access-token');
    req.flush({ content: [] });
    await promise;
  });

  it('allows public catalog GETs without a token', async () => {
    auth.ensureValidAccessToken.mockResolvedValue(null);

    const promise = firstValueFrom(
      http.get(`${environment.apiBaseUrl}/api/v1/products`),
    );
    await Promise.resolve();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/products`);

    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ content: [] });
    await promise;
  });

  it('starts login and cancels protected requests when unauthenticated', async () => {
    auth.ensureValidAccessToken.mockResolvedValue(null);
    const next = vi.fn();

    http
      .post(`${environment.apiBaseUrl}/api/v1/checkout/purchase`, {})
      .subscribe({ next, error: () => undefined });

    await Promise.resolve();
    httpMock.expectNone(`${environment.apiBaseUrl}/api/v1/checkout/purchase`);

    expect(auth.login).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
