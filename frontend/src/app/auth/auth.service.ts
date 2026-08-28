import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CartService } from '../cart/cart.service';
import { LocaleService } from '../i18n/locale.service';

interface TokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface AuthUser {
  username: string;
  subject: string;
  roles: string[];
}

const PKCE_VERIFIER_PREFIX = 'catalog.pkce.verifier.';
const OAUTH_RETURN_PREFIX = 'catalog.oauth.return.';
const ID_TOKEN_KEY = 'catalog.id_token';
const REFRESH_TOKEN_KEY = 'catalog.refresh_token';
const EXPIRES_AT_KEY = 'catalog.expires_at';
const FLASH_KEY = 'catalog.flash';
/** Refresh this many ms before access-token expiry */
const EXPIRY_SKEW_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(LocaleService);
  /** Lazy: avoids AuthService → CartService → HttpClient → interceptor → AuthService cycle at boot. */
  private readonly injector = inject(Injector);

  /** Access token stays in memory only (reduces XSS blast radius vs localStorage). */
  private readonly accessToken = signal<string | null>(null);
  private readonly idToken = signal<string | null>(sessionStorage.getItem(ID_TOKEN_KEY));
  private refreshInFlight: Promise<string | null> | null = null;
  private sessionEpoch = 0;

  /** True while restoring session from refresh token after a full-page load. */
  readonly sessionRestoring = signal(false);

  readonly isAuthenticated = computed(() => !!this.accessToken() && !this.isExpired());

  readonly currentUser = computed<AuthUser | null>(() => {
    if (!this.isAuthenticated()) {
      return null;
    }
    const claims = this.decodeClaims(this.accessToken()) ?? this.decodeClaims(this.idToken());
    if (!claims) {
      return null;
    }
    const username =
      (typeof claims['preferred_username'] === 'string' && claims['preferred_username']) ||
      (typeof claims['name'] === 'string' && claims['name']) ||
      (typeof claims['sub'] === 'string' && claims['sub']) ||
      'Account';
    const subject = typeof claims['sub'] === 'string' ? claims['sub'] : username;
    return { username, subject, roles: this.readRoles(claims) };
  });

  readonly isManager = computed(
    () => this.isAuthenticated() && (this.hasRole('MANAGER') || this.hasRole('ADMIN')),
  );

  readonly isAdmin = computed(() => this.isAuthenticated() && this.hasRole('ADMIN'));

  constructor() {
    // Restore session from refresh token after reload.
    if (sessionStorage.getItem(REFRESH_TOKEN_KEY)) {
      this.sessionRestoring.set(true);
      void this.ensureValidAccessToken().finally(() => this.sessionRestoring.set(false));
    }
  }

  getAccessToken(): string | null {
    if (this.isExpired()) {
      return null;
    }
    return this.accessToken();
  }

  async ensureValidAccessToken(): Promise<string | null> {
    if (this.accessToken() && !this.needsRefresh()) {
      return this.accessToken();
    }
    const refresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refresh) {
      if (this.isExpired()) {
        this.clearSession();
      }
      return this.accessToken() && !this.isExpired() ? this.accessToken() : null;
    }
    return this.refreshAccessToken(refresh);
  }

  async login(returnUrl = '/checkout'): Promise<void> {
    const verifier = this.createVerifier();
    const challenge = await this.createChallenge(verifier);
    const state = crypto.randomUUID();
    sessionStorage.setItem(PKCE_VERIFIER_PREFIX + state, verifier);
    sessionStorage.setItem(OAUTH_RETURN_PREFIX + state, returnUrl);

    const params = new HttpParams()
      .set('response_type', 'code')
      .set('client_id', environment.oauthClientId)
      .set('redirect_uri', environment.oauthRedirectUri)
      .set('scope', environment.oauthScopes)
      .set('state', state)
      .set('code_challenge', challenge)
      .set('code_challenge_method', 'S256')
      .set('ui_locales', this.i18n.language());

    window.location.href = `${environment.authIssuer}/oauth2/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const verifier = sessionStorage.getItem(PKCE_VERIFIER_PREFIX + state);
    const returnUrl = sessionStorage.getItem(OAUTH_RETURN_PREFIX + state) || '/checkout';
    try {
      if (!verifier) {
        throw new Error('Missing PKCE session');
      }

      const body = new HttpParams()
        .set('grant_type', 'authorization_code')
        .set('code', code)
        .set('redirect_uri', environment.oauthRedirectUri)
        .set('client_id', environment.oauthClientId)
        .set('code_verifier', verifier);

      const token = await firstValueFrom(
        this.http.post<TokenResponse>(`${environment.authIssuer}/oauth2/token`, body.toString(), {
          headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        }),
      );

      this.persistTokens(token);
      const navigated = await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      if (!navigated) {
        // Guard rejected or navigation cancelled — fall back to a full load of the return URL.
        window.location.replace(returnUrl.startsWith('/') ? returnUrl : '/checkout');
      }
    } finally {
      sessionStorage.removeItem(PKCE_VERIFIER_PREFIX + state);
      sessionStorage.removeItem(OAUTH_RETURN_PREFIX + state);
    }
  }

  logout(): void {
    this.sessionEpoch++;
    this.refreshInFlight = null;
    const idToken = sessionStorage.getItem(ID_TOKEN_KEY) ?? this.idToken();
    this.clearSession();
    this.injector.get(CartService).clearCart();
    sessionStorage.setItem(FLASH_KEY, 'toast.signedOut');

    const postLogout =
      environment.oauthPostLogoutRedirectUri ||
      `${window.location.origin}/products`;

    let params = new HttpParams()
      .set('client_id', environment.oauthClientId)
      .set('post_logout_redirect_uri', postLogout);
    if (idToken) {
      params = params.set('id_token_hint', idToken);
    }

    window.location.href = `${environment.authIssuer}/connect/logout?${params.toString()}`;
  }

  private async refreshAccessToken(refreshToken: string): Promise<string | null> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    const epoch = this.sessionEpoch;
    this.refreshInFlight = (async () => {
      try {
        const body = new HttpParams()
          .set('grant_type', 'refresh_token')
          .set('refresh_token', refreshToken)
          .set('client_id', environment.oauthClientId);

        const token = await firstValueFrom(
          this.http.post<TokenResponse>(`${environment.authIssuer}/oauth2/token`, body.toString(), {
            headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
          }),
        );
        if (epoch !== this.sessionEpoch) {
          return null;
        }
        this.persistTokens(token);
        return this.accessToken();
      } catch {
        if (epoch === this.sessionEpoch) {
          this.clearSession();
        }
        return null;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  private persistTokens(token: TokenResponse): void {
    this.accessToken.set(token.access_token);
    if (token.id_token) {
      sessionStorage.setItem(ID_TOKEN_KEY, token.id_token);
      this.idToken.set(token.id_token);
    }
    if (token.refresh_token) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token.refresh_token);
    }
    const expiresAt = Date.now() + Math.max(token.expires_in, 60) * 1000;
    sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  }

  private clearSession(): void {
    sessionStorage.removeItem(ID_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    // Migrate away from legacy localStorage tokens if present.
    localStorage.removeItem('catalog.access_token');
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    this.accessToken.set(null);
    this.idToken.set(null);
  }

  private isExpired(): boolean {
    const raw = sessionStorage.getItem(EXPIRES_AT_KEY);
    if (!raw) {
      return this.accessToken() == null;
    }
    return Date.now() >= Number(raw);
  }

  private needsRefresh(): boolean {
    const raw = sessionStorage.getItem(EXPIRES_AT_KEY);
    if (!raw) {
      return this.accessToken() == null;
    }
    return Date.now() >= Number(raw) - EXPIRY_SKEW_MS;
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles.includes(role) ?? false;
  }

  private readRoles(claims: Record<string, unknown>): string[] {
    const roles = claims['roles'];
    if (Array.isArray(roles)) {
      return roles.filter((role): role is string => typeof role === 'string');
    }
    return [];
  }

  private decodeClaims(token: string | null): Record<string, unknown> | null {
    if (!token) {
      return null;
    }
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private createVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64Url(array);
  }

  private async createChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64Url(new Uint8Array(digest));
  }

  private base64Url(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
