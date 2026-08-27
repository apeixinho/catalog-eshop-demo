import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { filter, take, timeout } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <section class="callback view-enter page-shell">
      @if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <p>{{ i18n.t('auth.signingIn') }}</p>
      }
    </section>
  `,
  styles: `
    .callback {
      padding-block: 6rem;
      text-align: center;
      color: var(--muted);
    }

    .error {
      color: var(--danger);
    }
  `,
})
export class AuthCallbackPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(LocaleService);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.completeLogin();
  }

  private async completeLogin(): Promise<void> {
    const params = await this.resolveQueryParams();

    const oauthError = params.get('error');
    if (oauthError) {
      const desc = params.get('error_description');
      const key = `auth.error.${oauthError}`;
      const translated = this.i18n.t(key);
      this.error.set(translated !== key ? translated : this.i18n.t('auth.error.generic'));
      if (desc && translated === key) {
        this.error.set(`${this.i18n.t('auth.error.generic')} (${desc})`);
      }
      return;
    }

    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      this.error.set(this.i18n.t('auth.error.missingCode'));
      return;
    }

    try {
      await this.auth.handleCallback(code, state);
    } catch {
      this.error.set(this.i18n.t('auth.error.loginFailed'));
    }
  }

  /** Wait briefly for IdP redirect query params; never hang forever if they never arrive. */
  private async resolveQueryParams(): Promise<ParamMap> {
    if (this.route.snapshot.queryParamMap.keys.length > 0) {
      return this.route.snapshot.queryParamMap;
    }
    try {
      return await firstValueFrom(
        this.route.queryParamMap.pipe(
          filter((map) => map.keys.length > 0),
          take(1),
          timeout(3000),
        ),
      );
    } catch (err) {
      if (!(err instanceof TimeoutError)) {
        throw err;
      }
      return this.route.snapshot.queryParamMap;
    }
  }
}
