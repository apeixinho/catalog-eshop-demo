import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'products',
    loadComponent: () => import('./products/products-page').then((m) => m.ProductsPage),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./products/product-detail-page').then((m) => m.ProductDetailPage),
  },
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart-page').then((m) => m.CartPage),
  },
  {
    path: 'checkout/result',
    // Public on purpose: payment-service redirects here after Pay/Cancel; access
    // token is memory-only and is lost on that full-page return.
    loadComponent: () =>
      import('./checkout/checkout-result-page').then((m) => m.CheckoutResultPage),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./checkout/checkout-page').then((m) => m.CheckoutPage),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./account/account-page').then((m) => m.AccountPage),
  },
  {
    path: 'account/orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./account/account-orders-page').then((m) => m.AccountOrdersPage),
  },
  {
    path: 'manage/orders',
    canActivate: [authGuard, roleGuard(['MANAGER', 'ADMIN'])],
    loadComponent: () => import('./manage/manage-orders-page').then((m) => m.ManageOrdersPage),
  },
  {
    path: 'manage/customers',
    canActivate: [authGuard, roleGuard(['MANAGER', 'ADMIN'])],
    loadComponent: () =>
      import('./manage/manage-customers-page').then((m) => m.ManageCustomersPage),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./auth/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  { path: '**', redirectTo: 'products' },
];
