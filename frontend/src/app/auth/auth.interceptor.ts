import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY, from, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

function isCatalogApiUrl(url: string): boolean {
  try {
    const api = new URL(environment.apiBaseUrl, window.location.origin);
    const target = new URL(url, window.location.origin);
    return target.origin === api.origin && target.pathname.startsWith(api.pathname.replace(/\/$/, '') || '/');
  } catch {
    return false;
  }
}

function requiresAuth(url: string): boolean {
  try {
    const target = new URL(url, window.location.origin);
    return /\/checkout\/(purchase|orders\/)/.test(target.pathname);
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (!isCatalogApiUrl(req.url)) {
    return next(req);
  }

  return from(auth.ensureValidAccessToken()).pipe(
    switchMap((token) => {
      if (!token && requiresAuth(req.url)) {
        const returnUrl = window.location.pathname + window.location.search;
        void auth.login(returnUrl);
        return EMPTY;
      }
      if (!token) {
        return next(req);
      }
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    }),
  );
};
