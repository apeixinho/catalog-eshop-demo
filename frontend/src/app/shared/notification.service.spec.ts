import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { NotificationService } from './notification.service';
import { LocaleService } from '../i18n/locale.service';

describe('NotificationService', () => {
  let notifications: NotificationService;

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: LocaleService, useValue: { t: (key: string) => key } },
      ],
    });

    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pushes success toast and auto-dismisses', () => {
    notifications.success('Saved');
    expect(notifications.toasts()).toHaveLength(1);
    expect(notifications.toasts()[0].message).toBe('Saved');
    expect(notifications.toasts()[0].tone).toBe('success');

    vi.advanceTimersByTime(3200);
    expect(notifications.toasts()).toHaveLength(0);
  });

  it('dismiss removes toast by id', () => {
    notifications.info('Notice');
    const id = notifications.toasts()[0].id;
    notifications.dismiss(id);
    expect(notifications.toasts()).toHaveLength(0);
  });

  it('consumeFlash reads session flash and shows info toast', () => {
    sessionStorage.setItem('catalog.flash', 'toast.signedOut');
    notifications.consumeFlash();

    expect(sessionStorage.getItem('catalog.flash')).toBeNull();
    expect(notifications.toasts()[0].message).toBe('toast.signedOut');
  });
});
