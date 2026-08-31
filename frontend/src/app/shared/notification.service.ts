import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LocaleService } from '../i18n/locale.service';

const FLASH_KEY = 'catalog.flash';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly i18n = inject(LocaleService);

  success(message: string, durationMs = 3200): void {
    this.snackBar.open(message, undefined, {
      duration: durationMs,
      panelClass: ['snackbar-success'],
    });
  }

  info(message: string, durationMs = 3200): void {
    this.snackBar.open(message, undefined, { duration: durationMs });
  }

  /** Show a flash message set before a full-page redirect (e.g. OIDC logout). */
  consumeFlash(): void {
    const flash = sessionStorage.getItem(FLASH_KEY);
    if (!flash) {
      return;
    }
    sessionStorage.removeItem(FLASH_KEY);
    this.info(this.i18n.t(flash));
  }
}
