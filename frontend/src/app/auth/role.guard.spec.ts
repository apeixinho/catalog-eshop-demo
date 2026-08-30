import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from './auth.service';
import { vi } from 'vitest';

describe('roleGuard', () => {
  it('redirects to login when there is no access token', async () => {
    const auth = {
      ensureValidAccessToken: vi.fn().mockResolvedValue(null),
      login: vi.fn(),
      hasRole: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const guard = roleGuard(['MANAGER']);
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as never, { url: '/manage/orders' } as never),
    );

    expect(result).toBe(false);
    expect(auth.login).toHaveBeenCalledWith('/manage/orders');
    expect(router).toBeTruthy();
  });
});
