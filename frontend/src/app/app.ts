import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { CartService } from './cart/cart.service';
import { AuthService } from './auth/auth.service';
import { NotificationService } from './shared/notification.service';
import { LocaleService } from './i18n/locale.service';
import { CountryCode } from './i18n/locale.models';
import { CatalogApiService } from './shared/catalog-api.service';
import { ThemeService } from './theme/theme.service';
import { ThemeId } from './theme/theme.models';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
  ],
  template: `
    <div class="shell">
      <mat-toolbar class="site-header">
        <div class="header-inner page-shell">
          <a routerLink="/products" class="brand" [attr.aria-label]="i18n.t('nav.catalog')">
            <span class="brand-mark" aria-hidden="true">
              <span class="leaf"></span>
            </span>
            <span class="brand-type">{{ i18n.t('nav.catalog') }}</span>
          </a>

          <nav class="main-nav" [attr.aria-label]="i18n.t('nav.primary')">
            <a
              mat-icon-button
              class="nav-icon"
              routerLink="/cart"
              routerLinkActive="active"
              [attr.aria-label]="i18n.t('nav.cart')"
              [matBadge]="cart.totalItems()"
              [matBadgeHidden]="cart.totalItems() === 0"
              matBadgeColor="primary"
              matBadgeSize="small"
            >
              <mat-icon>shopping_bag</mat-icon>
            </a>

            <button
              mat-icon-button
              class="nav-icon"
              type="button"
              [matMenuTriggerFor]="accountMenu"
              [attr.aria-label]="
                auth.sessionRestoring()
                  ? i18n.t('nav.account')
                  : auth.isAuthenticated()
                    ? auth.currentUser()?.username || i18n.t('nav.account')
                    : i18n.t('nav.signIn')
              "
            >
              <mat-icon>account_circle</mat-icon>
            </button>

            <mat-menu #accountMenu="matMenu" class="account-menu">
              @if (auth.sessionRestoring()) {
                <button mat-menu-item disabled>{{ i18n.t('nav.restoringSession') }}</button>
              } @else if (auth.isAuthenticated()) {
                <button mat-menu-item disabled>{{ auth.currentUser()?.username }}</button>
                <a mat-menu-item routerLink="/account">{{ i18n.t('nav.userDetails') }}</a>
                <a mat-menu-item routerLink="/account/orders">{{ i18n.t('nav.orderDetails') }}</a>
                @if (auth.isManager()) {
                  <a mat-menu-item routerLink="/manage/orders">{{ i18n.t('nav.manageOrders') }}</a>
                  <a mat-menu-item routerLink="/manage/customers">{{
                    i18n.t('nav.manageCustomers')
                  }}</a>
                }
                <button mat-menu-item type="button" (click)="auth.logout()">
                  {{ i18n.t('nav.signOut') }}
                </button>
              } @else {
                <button mat-menu-item type="button" (click)="auth.login()">
                  {{ i18n.t('nav.signIn') }}
                </button>
              }

              <mat-divider />

              <button mat-menu-item [matMenuTriggerFor]="themeMenu" type="button">
                <mat-icon>palette</mat-icon>
                <span>{{ i18n.t('nav.theme') }}</span>
              </button>
              <button mat-menu-item [matMenuTriggerFor]="localeMenu" type="button">
                <mat-icon>language</mat-icon>
                <span>{{ i18n.t('nav.locale') }}</span>
              </button>
            </mat-menu>

            <mat-menu #themeMenu="matMenu" class="chrome-submenu">
              @for (option of theme.options; track option.id) {
                <button
                  mat-menu-item
                  type="button"
                  [class.active-option]="theme.themeId() === option.id"
                  (click)="onThemeChange(option.id)"
                >
                  <mat-icon [class.option-check-hidden]="theme.themeId() !== option.id"
                    >check</mat-icon
                  >
                  <span>{{ i18n.t(option.labelKey) }}</span>
                </button>
              }
            </mat-menu>

            <mat-menu #localeMenu="matMenu" class="chrome-submenu">
              @for (option of i18n.options; track option.countryCode) {
                <button
                  mat-menu-item
                  type="button"
                  [class.active-option]="i18n.countryCode() === option.countryCode"
                  (click)="onLocaleChange(option.countryCode)"
                >
                  <mat-icon
                    [class.option-check-hidden]="i18n.countryCode() !== option.countryCode"
                    >check</mat-icon
                  >
                  <span>{{ i18n.optionLabel(option) }}</span>
                </button>
              }
            </mat-menu>
          </nav>
        </div>
      </mat-toolbar>

      <main class="main">
        <router-outlet />
      </main>

      <footer class="site-footer">
        <div class="footer-inner page-shell">
          <div class="footer-brand">
            <a routerLink="/products" class="brand brand-footer">
              <span class="brand-mark" aria-hidden="true"><span class="leaf"></span></span>
              <span class="brand-type">{{ i18n.t('nav.catalog') }}</span>
            </a>
            <p>{{ i18n.t('footer.tagline') }}</p>
          </div>
          <div class="footer-meta">
            <span>{{ i18n.t('footer.address') }}</span>
            <span>{{ i18n.t('footer.hours') }}</span>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: `
    .shell {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }

    .site-header {
      position: sticky;
      top: 0;
      z-index: 40;
      height: auto !important;
      min-height: var(--catalog-header-height);
      padding: 0 !important;
      background: color-mix(in srgb, var(--mat-sys-surface) 82%, transparent) !important;
      backdrop-filter: blur(16px) saturate(1.2);
      border-bottom: 1px solid color-mix(in srgb, var(--mat-sys-outline-variant) 65%, transparent);
      box-shadow: 0 1px 0 color-mix(in srgb, white 40%, transparent);
    }

    .header-inner {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-block: 0.65rem;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      text-decoration: none;
      color: var(--mat-sys-on-surface);
      transition: color 0.2s var(--catalog-ease-out), transform 0.25s var(--catalog-ease-spring);
    }

    .brand:hover {
      color: var(--mat-sys-primary);
      transform: translateY(-1px);
    }

    .brand-mark {
      width: 2rem;
      height: 2rem;
      border-radius: 0.7rem;
      display: grid;
      place-items: center;
      background:
        linear-gradient(
          145deg,
          color-mix(in srgb, var(--mat-sys-primary) 88%, white),
          var(--mat-sys-primary)
        );
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 28%), var(--catalog-shadow-sm);
    }

    .leaf {
      width: 0.72rem;
      height: 0.95rem;
      border-radius: 70% 10% 60% 20%;
      background: color-mix(in srgb, var(--mat-sys-on-primary) 92%, white);
      transform: rotate(-18deg);
      display: block;
    }

    .brand-type {
      font-size: 1.2rem;
      font-weight: 750;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    @media (min-width: 768px) {
      .brand-type {
        font-size: 1.35rem;
      }
    }

    .main-nav {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.15rem;
    }

    .nav-icon.active {
      color: var(--mat-sys-primary);
    }

    .main {
      flex: 1;
    }

    .site-footer {
      margin-top: auto;
      border-top: 1px solid color-mix(in srgb, var(--mat-sys-outline-variant) 70%, transparent);
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, var(--mat-sys-surface-container-low) 55%, transparent),
          var(--mat-sys-surface-container-low)
        );
    }

    .footer-inner {
      display: grid;
      gap: 1.5rem;
      padding-block: 2.5rem 3rem;
    }

    @media (min-width: 720px) {
      .footer-inner {
        grid-template-columns: 1.4fr 1fr;
        align-items: end;
        gap: 2rem;
      }
    }

    .footer-brand p {
      margin: 0.85rem 0 0;
      max-width: 28rem;
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.55;
      font-size: 0.95rem;
    }

    .brand-footer .brand-mark {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 0.6rem;
    }

    .footer-meta {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }

    @media (min-width: 720px) {
      .footer-meta {
        text-align: right;
        align-items: flex-end;
      }
    }

    :host ::ng-deep .active-option {
      color: var(--mat-sys-primary);
      font-weight: 650;
    }

    :host ::ng-deep .option-check-hidden {
      visibility: hidden;
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
