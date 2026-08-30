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
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { LocaleService } from '../i18n/locale.service';
import { CartService } from '../cart/cart.service';
import { NotificationService } from '../shared/notification.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { fakeJwt } from '../testing/jwt-test-support';
import { environment } from '../../environments/environment';
import { vi } from 'vitest';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthService,
        LocaleService,
        CartService,
        CatalogApiService,
        {
          provide: NotificationService,
          useValue: { success: vi.fn(), info: vi.fn() },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    auth = TestBed.inject(AuthService);
    // Constructor may trigger refresh when refresh token exists — flush none expected here.
    httpMock.match(() => true).forEach((req) => req.flush({}));
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reports unauthenticated without tokens', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
  });

  it('hasRole returns false when logged out', () => {
    expect(auth.hasRole('MANAGER')).toBe(false);
  });

  it('exposes roles and manager/admin flags from access token claims', async () => {
    await seedSession(auth, httpMock, {
      roles: ['USER', 'MANAGER'],
      preferred_username: 'manager',
      sub: 'oauth-sub-1',
    });

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.hasRole('MANAGER')).toBe(true);
    expect(auth.isAdmin()).toBe(false);
    expect(auth.isManager()).toBe(true);
    expect(auth.currentUser()).toEqual({
      username: 'manager',
      subject: 'oauth-sub-1',
      roles: ['USER', 'MANAGER'],
    });
  });

  it('ensureValidAccessToken returns cached token when not near expiry', async () => {
    const token = fakeJwt({ sub: 'user-1', roles: ['USER'] });
    await seedSession(auth, httpMock, { sub: 'user-1', roles: ['USER'] }, token);

    const result = await auth.ensureValidAccessToken();

    expect(result).toBe(token);
  });

  it('handleCallback exchanges code for tokens and navigates to return URL', async () => {
    const state = 'state-abc';
    sessionStorage.setItem(`catalog.pkce.verifier.${state}`, 'verifier-123');
    sessionStorage.setItem(`catalog.oauth.return.${state}`, '/account/orders');

    const token = fakeJwt({ sub: 'shopper', roles: ['USER'] });
    const promise = auth.handleCallback('auth-code', state);

    const req = httpMock.expectOne(`${environment.authIssuer}/oauth2/token`);
    expect(req.request.method).toBe('POST');
    req.flush({
      access_token: token,
      refresh_token: 'refresh-1',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    await promise;

    expect(router.navigateByUrl).toHaveBeenCalledWith('/account/orders', {
      replaceUrl: true,
    });
    expect(sessionStorage.getItem(`catalog.pkce.verifier.${state}`)).toBeNull();
    expect(auth.getAccessToken()).toBe(token);
  });

  it('refreshAccessToken clears session when refresh fails', async () => {
    sessionStorage.setItem('catalog.refresh_token', 'bad-refresh');
    sessionStorage.setItem('catalog.expires_at', String(Date.now() - 1000));

    const promise = auth.ensureValidAccessToken();
    const req = httpMock.expectOne(`${environment.authIssuer}/oauth2/token`);
    req.flush('invalid_grant', { status: 400, statusText: 'Bad Request' });

    const result = await promise;

    expect(result).toBeNull();
    expect(sessionStorage.getItem('catalog.refresh_token')).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });
});

async function seedSession(
  auth: AuthService,
  httpMock: HttpTestingController,
  claims: Record<string, unknown>,
  accessToken?: string,
): Promise<void> {
  const state = 'seed-state';
  sessionStorage.setItem(`catalog.pkce.verifier.${state}`, 'verifier');
  sessionStorage.setItem(`catalog.oauth.return.${state}`, '/products');

  const token = accessToken ?? fakeJwt(claims);
  const promise = auth.handleCallback('code', state);
  httpMock.expectOne(`${environment.authIssuer}/oauth2/token`).flush({
    access_token: token,
    refresh_token: 'refresh-seed',
    expires_in: 3600,
    token_type: 'Bearer',
  });
  await promise;
}
