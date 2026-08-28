import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from './cart/cart.service';
import { AuthService } from './auth/auth.service';
import { NotificationService } from './shared/notification.service';
import { ToastHost } from './shared/toast-host';
import { LocaleService } from './i18n/locale.service';
import { CountryCode } from './i18n/locale.models';
import { CatalogApiService } from './shared/catalog-api.service';
import { ThemeService } from './theme/theme.service';
import { ThemeId } from './theme/theme.models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastHost, FormsModule],
  template: `
    <div class="shell">
      <header class="site-header">
        <div class="header-inner page-shell">
          <a routerLink="/products" class="brand">{{ i18n.t('nav.catalog') }}</a>
          <nav class="main-nav" [attr.aria-label]="i18n.t('nav.primary')">
            <a
              routerLink="/cart"
              routerLinkActive="active"
              class="nav-link icon-link"
              [attr.aria-label]="i18n.t('nav.cart')"
              [attr.title]="i18n.t('nav.cart')"
            >
              <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.5 6.5h1.6l1.4 10.2a1.5 1.5 0 0 0 1.5 1.3h9.2a1.5 1.5 0 0 0 1.5-1.3L20 9H7"
                />
                <circle cx="9.5" cy="20" r="1.1" fill="currentColor" />
                <circle cx="16.5" cy="20" r="1.1" fill="currentColor" />
              </svg>
              @if (cart.totalItems() > 0) {
                <span class="cart-count">{{ cart.totalItems() }}</span>
              }
            </a>

            <label class="chrome-picker">
              <span class="sr-only">{{ i18n.t('nav.theme') }}</span>
              <select
                class="chrome-select"
                [ngModel]="theme.themeId()"
                (ngModelChange)="onThemeChange($event)"
              >
                @for (option of theme.options; track option.id) {
                  <option [ngValue]="option.id">
                    {{ i18n.t(option.labelKey) }}
                  </option>
                }
              </select>
            </label>

            <label class="chrome-picker">
              <span class="sr-only">{{ i18n.t('nav.locale') }}</span>
              <select
                class="chrome-select"
                [ngModel]="i18n.countryCode()"
                (ngModelChange)="onLocaleChange($event)"
              >
                @for (option of i18n.options; track option.countryCode) {
                  <option [ngValue]="option.countryCode">
                    {{ i18n.optionLabel(option) }}
                  </option>
                }
              </select>
            </label>

            <div class="account-menu">
              <button
                type="button"
                class="nav-link icon-link account-trigger"
                aria-haspopup="true"
                [attr.aria-label]="
                  auth.sessionRestoring()
                    ? i18n.t('nav.account')
                    : auth.isAuthenticated()
                      ? auth.currentUser()?.username || i18n.t('nav.account')
                      : i18n.t('nav.signIn')
                "
              >
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" stroke-width="1.5" />
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    d="M5.5 19.25c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5"
                  />
                </svg>
              </button>
              <div class="account-dropdown" role="menu">
                @if (auth.sessionRestoring()) {
                  <p class="account-name">{{ i18n.t('nav.restoringSession') }}</p>
                } @else if (auth.isAuthenticated()) {
                  <p class="account-name">{{ auth.currentUser()?.username }}</p>
                  <a routerLink="/account" role="menuitem">{{ i18n.t('nav.userDetails') }}</a>
                  <button type="button" role="menuitem" (click)="auth.logout()">
                    {{ i18n.t('nav.signOut') }}
                  </button>
                } @else {
                  <button type="button" role="menuitem" (click)="auth.login()">
                    {{ i18n.t('nav.signIn') }}
                  </button>
                }
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main class="main">
        <router-outlet />
      </main>

      <footer class="site-footer">
        <div class="footer-inner page-shell">
          <span>{{ i18n.t('footer.tagline') }}</span>
          <span>{{ i18n.t('footer.address') }}</span>
        </div>
      </footer>

      <app-toast-host />
    </div>
  `,
  styles: `
    .shell {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      font-family: var(--font-sans);
      color: var(--fg);
      background: var(--bg);
    }

    .site-header {
      border-bottom: 1px solid var(--border);
      background: var(--bg);
    }

    :host-context([data-theme='alternative']) .site-header {
      background: var(--surface);
      box-shadow: var(--elev-raised);
      border-bottom-color: transparent;
    }

    :host-context([data-theme='alternative']) .brand {
      font-weight: 600;
      letter-spacing: -0.015em;
    }

    :host-context([data-theme='alternative']) .main-nav {
      letter-spacing: 0.01em;
    }

    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      padding-block: 1.25rem;
    }

    .brand {
      font-family: var(--font-display);
      font-size: 1.25rem;
      letter-spacing: -0.02em;
      text-decoration: none;
      transition: color 0.3s ease;
    }

    .brand:hover {
      color: var(--accent);
    }

    @media (min-width: 640px) {
      .brand {
        font-size: 1.5rem;
      }
    }

    .main-nav {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 1rem 1.25rem;
      font-size: 0.875rem;
      letter-spacing: 0.04em;
    }

    @media (min-width: 640px) {
      .main-nav {
        gap: 1rem 1.75rem;
      }
    }

    .nav-link {
      position: relative;
      color: var(--muted);
      text-decoration: none;
      transition: color 0.3s ease;
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      letter-spacing: inherit;
      cursor: pointer;
    }

    .nav-link::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -2px;
      width: 100%;
      height: 1px;
      background: var(--accent);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.35s ease;
    }

    .nav-link:hover,
    .nav-link.active {
      color: var(--fg);
    }

    .nav-link:hover::after,
    .nav-link.active::after {
      transform: scaleX(1);
    }

    .icon-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .icon-link::after,
    .account-trigger::after {
      display: none;
    }

    .nav-icon {
      width: 1.35rem;
      height: 1.35rem;
      display: block;
    }

    .chrome-picker {
      display: flex;
      align-items: center;
    }

    .chrome-select {
      max-width: 11rem;
      border: 0;
      border-bottom: 1px solid var(--border);
      background: transparent;
      color: var(--fg);
      font: inherit;
      font-size: 0.75rem;
      letter-spacing: 0.02em;
      padding: 0.25rem 0;
      cursor: pointer;
    }

    @media (min-width: 768px) {
      .chrome-select {
        max-width: 16rem;
        font-size: 0.8rem;
      }
    }

    .chrome-select:focus {
      outline: none;
      border-color: var(--accent);
    }

    .account-menu {
      position: relative;
      padding-bottom: 0.75rem;
      margin-bottom: -0.75rem;
    }

    .account-dropdown {
      position: absolute;
      top: calc(100% - 0.35rem);
      right: 0;
      min-width: 11rem;
      padding: 0.5rem 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--elev-raised);
      opacity: 0;
      visibility: hidden;
      transform: translateY(4px);
      transition:
        opacity 0.2s ease,
        transform 0.2s ease,
        visibility 0.2s ease;
      z-index: 20;
    }

    .account-menu:hover .account-dropdown,
    .account-menu:focus-within .account-dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .account-name {
      margin: 0;
      padding: 0.4rem 1rem 0.65rem;
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      color: var(--fg);
      border-bottom: 1px solid var(--border);
    }

    .account-dropdown a,
    .account-dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.65rem 1rem;
      border: 0;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      text-decoration: none;
      cursor: pointer;
      transition: color 0.2s ease, background 0.2s ease;
    }

    .account-dropdown a:hover,
    .account-dropdown button:hover {
      color: var(--fg);
      background: var(--surface);
    }

    .cart-count {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      min-width: 1.1rem;
      text-align: center;
      color: var(--fg);
    }

    .main {
      flex: 1;
    }

    .site-footer {
      border-top: 1px solid var(--border);
      margin-top: auto;
    }

    .footer-inner {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.5rem;
      padding-block: 2rem;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      color: var(--muted);
    }

    @media (min-width: 640px) {
      .footer-inner {
        flex-direction: row;
      }
    }
  `,
})
export class App implements OnInit {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  readonly i18n = inject(LocaleService);
  readonly theme = inject(ThemeService);
  private readonly notifications = inject(NotificationService);
  private readonly api = inject(CatalogApiService);

  private readonly syncDocumentLocale = effect(() => {
    document.documentElement.lang = this.i18n.language();
    document.title = this.i18n.t('nav.catalog');
  });

  ngOnInit(): void {
    this.notifications.consumeFlash();
    this.api.getCurrencyRates().subscribe({
      next: (rates) => this.i18n.setFxRates(rates),
      error: () => {
        /* keep fallback rates */
      },
    });
  }

  onLocaleChange(code: CountryCode): void {
    this.i18n.selectCountry(code);
  }

  onThemeChange(theme: ThemeId): void {
    this.theme.select(theme);
  }
}
