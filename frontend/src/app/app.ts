import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
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
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatSelectModule,
    MatFormFieldModule,
    MatMenuModule,
  ],
  template: `
    <div class="shell">
      <mat-toolbar class="site-header">
        <a routerLink="/products" class="brand">{{ i18n.t('nav.catalog') }}</a>
        <span class="spacer"></span>
        <nav class="main-nav" [attr.aria-label]="i18n.t('nav.primary')">
          <a
            mat-icon-button
            routerLink="/cart"
            routerLinkActive="active"
            [attr.aria-label]="i18n.t('nav.cart')"
            [matBadge]="cart.totalItems()"
            [matBadgeHidden]="cart.totalItems() === 0"
            matBadgeColor="primary"
            matBadgeSize="small"
          >
            <mat-icon>shopping_cart</mat-icon>
          </a>

          <mat-form-field class="chrome-field" subscriptSizing="dynamic">
            <mat-label class="sr-only">{{ i18n.t('nav.theme') }}</mat-label>
            <mat-select
              [ngModel]="theme.themeId()"
              (ngModelChange)="onThemeChange($event)"
              [attr.aria-label]="i18n.t('nav.theme')"
            >
              @for (option of theme.options; track option.id) {
                <mat-option [value]="option.id">{{ i18n.t(option.labelKey) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field class="chrome-field" subscriptSizing="dynamic">
            <mat-label class="sr-only">{{ i18n.t('nav.locale') }}</mat-label>
            <mat-select
              [ngModel]="i18n.countryCode()"
              (ngModelChange)="onLocaleChange($event)"
              [attr.aria-label]="i18n.t('nav.locale')"
            >
              @for (option of i18n.options; track option.countryCode) {
                <mat-option [value]="option.countryCode">{{
                  i18n.optionLabel(option)
                }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button
            mat-icon-button
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
          <mat-menu #accountMenu="matMenu">
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
          </mat-menu>
        </nav>
      </mat-toolbar>

      <main class="main">
        <router-outlet />
      </main>

      <footer class="site-footer page-shell">
        <span>{{ i18n.t('footer.tagline') }}</span>
        <span>{{ i18n.t('footer.address') }}</span>
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
      gap: 0.5rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
    }

    .brand {
      font: var(--mat-sys-title-large);
      text-decoration: none;
      color: var(--mat-sys-on-surface);
    }

    .brand:hover {
      color: var(--mat-sys-primary);
    }

    .spacer {
      flex: 1;
    }

    .main-nav {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.25rem;
    }

    .chrome-field {
      width: min(11rem, 40vw);
      font-size: 0.875rem;
    }

    @media (min-width: 768px) {
      .chrome-field {
        width: min(14rem, 30vw);
      }
    }

    .main {
      flex: 1;
    }

    .site-footer {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.5rem;
      padding-block: 2rem;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    @media (min-width: 640px) {
      .site-footer {
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
