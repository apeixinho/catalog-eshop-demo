import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AccountPage } from './account-page';
import { AuthService } from '../auth/auth.service';
import { LocaleService } from '../i18n/locale.service';

describe('AccountPage', () => {
  async function setup(
    authValue: { username: string; subject: string; roles: string[] } | null,
  ): Promise<ComponentFixture<AccountPage>> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AccountPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(authValue),
            login: vi.fn(),
          },
        },
        {
          provide: LocaleService,
          useValue: { t: (key: string) => key },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();
    return fixture;
  }

  it('shows username when signed in', async () => {
    const fixture = await setup({
      username: 'shopper',
      subject: 'sub-1',
      roles: ['USER'],
    });
    expect(fixture.nativeElement.textContent).toContain('shopper');
  });

  it('shows sign-in prompt when logged out', async () => {
    const fixture = await setup(null);
    expect(fixture.nativeElement.textContent).toContain('account.notSignedIn');
  });
});
