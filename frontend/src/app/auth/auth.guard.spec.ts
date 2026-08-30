import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { vi } from 'vitest';

describe('authGuard', () => {
  it('allows navigation when a valid access token exists', async () => {
    const auth = {
      ensureValidAccessToken: vi.fn().mockResolvedValue('access-token'),
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/checkout' } as never),
    );

    expect(result).toBe(true);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('starts login and blocks when there is no access token', async () => {
    const auth = {
      ensureValidAccessToken: vi.fn().mockResolvedValue(null),
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/checkout' } as never),
    );

    expect(result).toBe(false);
    expect(auth.login).toHaveBeenCalledWith('/checkout');
  });
});
