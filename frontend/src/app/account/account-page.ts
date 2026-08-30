import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../auth/auth.service';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'app-account-page',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  template: `
    <section class="account view-enter page-shell">
      <p class="eyebrow">{{ i18n.t('nav.account') }}</p>
      <h1>{{ i18n.t('account.title') }}</h1>
      @if (auth.currentUser(); as user) {
        <mat-card>
          <mat-card-content>
            <dl>
              <div>
                <dt>{{ i18n.t('account.username') }}</dt>
                <dd>{{ user.username }}</dd>
              </div>
            </dl>
          </mat-card-content>
        </mat-card>
      } @else {
        <p class="muted">{{ i18n.t('account.notSignedIn') }}</p>
        <button mat-stroked-button type="button" (click)="auth.login('/account')">
          {{ i18n.t('nav.signIn') }}
        </button>
      }
      <a mat-stroked-button class="back" routerLink="/products">{{ i18n.t('account.back') }}</a>
    </section>
  `,
  styles: `
    .account {
      max-width: 36rem;
      padding-block: 3.5rem;
    }

    @media (min-width: 640px) {
      .account {
        padding-block: 5rem;
      }
    }

    h1 {
      margin: 0 0 2.5rem;
      font: var(--mat-sys-display-small);
    }

    mat-card {
      margin-bottom: 2.5rem;
    }

    dl {
      margin: 0;
      display: grid;
      gap: 1.5rem;
    }

    dl > div {
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      padding-bottom: 1rem;
    }

    dt {
      margin: 0 0 0.35rem;
      font: var(--mat-sys-label-medium);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
    }

    dd {
      margin: 0;
      font: var(--mat-sys-body-large);
    }

    .muted {
      margin-bottom: 1.5rem;
    }

    .back {
      margin-top: 1rem;
    }
  `,
})
export class AccountPage {
  readonly auth = inject(AuthService);
  readonly i18n = inject(LocaleService);
}
