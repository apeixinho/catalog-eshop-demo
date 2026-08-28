import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard = (roles: string[]): CanActivateFn => async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = await auth.ensureValidAccessToken();
  if (!token) {
    void auth.login(state.url);
    return false;
  }
  if (roles.some((role) => auth.hasRole(role))) {
    return true;
  }
  return router.parseUrl('/products');
};
