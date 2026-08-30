import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
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
    toasts: ReturnType<typeof signal<[]>>;
    dismiss: ReturnType<typeof vi.fn>;
  };

  const ratesUrl = `${environment.apiBaseUrl}/api/v1/currency/rates`;

  beforeEach(async () => {
    notifications = {
      consumeFlash: vi.fn(),
      toasts: signal([]),
      dismiss: vi.fn(),
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
});
