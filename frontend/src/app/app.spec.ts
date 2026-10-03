import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { harnessLoader } from './testing/material-harness-support';
import { App } from './app';
import { NotificationService } from './shared/notification.service';
import { LocaleService } from './i18n/locale.service';
import { ThemeService } from './theme/theme.service';
import { CartService } from './cart/cart.service';
import { AuthService } from './auth/auth.service';
import { environment } from '../environments/environment';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let httpMock: HttpTestingController;
  let locale: LocaleService;
  let theme: ThemeService;
  let notifications: {
    consumeFlash: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const ratesUrl = `${environment.apiBaseUrl}/api/v1/currency/rates`;

  beforeEach(async () => {
    notifications = {
      consumeFlash: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        LocaleService,
        ThemeService,
        { provide: NotificationService, useValue: notifications },
        {
          provide: CartService,
          useValue: {
            totalItems: signal(0),
            items: signal([]),
          },
        },
        {
          provide: AuthService,
          useValue: {
            sessionRestoring: signal(false),
            isAuthenticated: signal(false),
            currentUser: signal(null),
            isManager: () => false,
            login: vi.fn(),
            logout: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    locale = TestBed.inject(LocaleService);
    theme = TestBed.inject(ThemeService);
    fixture = TestBed.createComponent(App);
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => {
      try {
        req.flush({});
      } catch {
        /* already handled */
      }
    });
    httpMock.verify();
  });

  function initApp(): void {
    fixture.detectChanges();
    httpMock.expectOne(ratesUrl).flush({ eur: 0.92 });
  }

  it('should create the app', () => {
    initApp();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('consumes flash and loads FX rates on init', () => {
    initApp();
    expect(notifications.consumeFlash).toHaveBeenCalled();
    locale.selectCountry('PT');
    expect(locale.toDisplayMoney(10)).not.toBe(10);
  });

  it('keeps fallback FX rates when rates request fails', () => {
    fixture.detectChanges();
    expect(notifications.consumeFlash).toHaveBeenCalled();
    httpMock.expectOne(ratesUrl).error(new ProgressEvent('error'));
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('updates locale and theme from chrome handlers', () => {
    initApp();
    const selectCountry = vi.spyOn(locale, 'selectCountry');
    const selectTheme = vi.spyOn(theme, 'select');

    fixture.componentInstance.onLocaleChange('US');
    fixture.componentInstance.onThemeChange('alternative');

    expect(selectCountry).toHaveBeenCalledWith('US');
    expect(selectTheme).toHaveBeenCalledWith('alternative');
  });

  it('syncs document lang and title from locale effect', () => {
    initApp();
    locale.selectCountry('US');
    fixture.detectChanges();

    expect(document.documentElement.lang).toBe(locale.language());
    expect(document.title).toBe(locale.t('nav.catalog'));
  });

  it('exposes theme and locale choices under the account menu', async () => {
    initApp();
    const loader = harnessLoader(fixture);
    const menus = await loader.getAllHarnesses(MatMenuHarness);
    expect(menus.length).toBeGreaterThanOrEqual(1);

    const accountMenu = menus[0];
    await accountMenu.open();
    const items = await accountMenu.getItems();
    const labels = await Promise.all(items.map((item) => item.getText()));
    expect(labels.some((label) => label.includes(locale.t('nav.theme')))).toBe(true);
    expect(labels.some((label) => label.includes(locale.t('nav.locale')))).toBe(true);
  });

  it('shows a check only on the selected theme and locale options', async () => {
    initApp();
    theme.select('default');
    locale.selectCountry('US');
    fixture.detectChanges();

    const loader = harnessLoader(fixture);
    const [accountMenu] = await loader.getAllHarnesses(MatMenuHarness);
    await accountMenu.open();

    const openSubmenu = async (label: string) => {
      const items = await accountMenu.getItems();
      const texts = await Promise.all(items.map((item) => item.getText()));
      const index = texts.findIndex((text) => text.includes(label));
      expect(index).toBeGreaterThanOrEqual(0);
      const trigger = items[index];
      await (await trigger.host()).dispatchEvent('mouseenter');
      const submenu = await trigger.getSubmenu();
      expect(submenu).toBeTruthy();
      await submenu!.open();
      return submenu!;
    };

    const visibleChecksInOpenPanel = () => {
      const panels = document.querySelectorAll('.cdk-overlay-pane .mat-mdc-menu-panel');
      const panel = panels[panels.length - 1];
      expect(panel).toBeTruthy();
      return [...panel!.querySelectorAll('mat-icon')].filter(
        (icon) =>
          icon.textContent?.trim() === 'check' && getComputedStyle(icon).visibility !== 'hidden',
      );
    };

    const themeSub = await openSubmenu(locale.t('nav.theme'));
    expect(visibleChecksInOpenPanel().length).toBe(1);
    await themeSub.close();
    await accountMenu.close();

    await accountMenu.open();
    const localeSub = await openSubmenu(locale.t('nav.locale'));
    expect(visibleChecksInOpenPanel().length).toBe(1);
    await localeSub.close();
  });
});
