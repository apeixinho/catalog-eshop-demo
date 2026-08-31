import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { NotificationService } from './notification.service';
import { LocaleService } from '../i18n/locale.service';

describe('NotificationService', () => {
  let notifications: NotificationService;
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    snackBar = { open: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: snackBar },
        { provide: LocaleService, useValue: { t: (key: string) => key } },
      ],
    });

    notifications = TestBed.inject(NotificationService);
  });

  it('opens success snackbar', () => {
    notifications.success('Saved');
    expect(snackBar.open).toHaveBeenCalledWith('Saved', undefined, {
      duration: 3200,
      panelClass: ['snackbar-success'],
    });
  });

  it('opens info snackbar', () => {
    notifications.info('Notice');
    expect(snackBar.open).toHaveBeenCalledWith('Notice', undefined, { duration: 3200 });
  });

  it('consumeFlash reads session flash and shows info snackbar', () => {
    sessionStorage.setItem('catalog.flash', 'toast.signedOut');
    notifications.consumeFlash();

    expect(sessionStorage.getItem('catalog.flash')).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('toast.signedOut', undefined, { duration: 3200 });
  });
});
