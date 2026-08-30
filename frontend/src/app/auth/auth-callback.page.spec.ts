import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { vi } from 'vitest';
import { AuthCallbackPage } from './auth-callback.page';
import { AuthService } from './auth.service';
import { LocaleService } from '../i18n/locale.service';

describe('AuthCallbackPage', () => {
  let fixture: ComponentFixture<AuthCallbackPage>;
  let component: AuthCallbackPage;
  let auth: {
    handleCallback: ReturnType<typeof vi.fn>;
  };

  const localeMock = {
    t: (key: string) => {
      if (key === 'auth.error.access_denied') {
        return 'Access was denied';
      }
      if (key === 'auth.error.generic') {
        return 'Sign-in failed';
      }
      if (key === 'auth.error.loginFailed') {
        return 'Login failed';
      }
      return key;
    },
  };

  async function setup(queryParams: Record<string, string>): Promise<void> {
    auth = {
      handleCallback: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [AuthCallbackPage],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: LocaleService, useValue: localeMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(queryParams) },
            queryParamMap: convertToParamMap(queryParams),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthCallbackPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('shows translated OAuth error from query params', async () => {
    await setup({ error: 'access_denied' });

    expect(component.error()).toBe('Access was denied');
    expect(auth.handleCallback).not.toHaveBeenCalled();
  });

  it('shows missing code error when code or state is absent', async () => {
    await setup({ code: 'only-code' });

    expect(component.error()).toBe('auth.error.missingCode');
    expect(auth.handleCallback).not.toHaveBeenCalled();
  });

  it('delegates to AuthService on successful callback', async () => {
    await setup({ code: 'auth-code', state: 'state-1' });

    expect(auth.handleCallback).toHaveBeenCalledWith('auth-code', 'state-1');
    expect(component.error()).toBeNull();
  });

  it('shows login failed when token exchange throws', async () => {
    auth = {
      handleCallback: vi.fn().mockRejectedValue(new Error('exchange failed')),
    };

    await TestBed.configureTestingModule({
      imports: [AuthCallbackPage],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: LocaleService, useValue: localeMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ code: 'c', state: 's' }) },
            queryParamMap: convertToParamMap({ code: 'c', state: 's' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthCallbackPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    expect(component.error()).toBe('Login failed');
  });
});
