import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { ToastHost } from './toast-host';
import { NotificationService } from './notification.service';

describe('ToastHost', () => {
  let fixture: ComponentFixture<ToastHost>;
  let dismiss: ReturnType<typeof vi.fn>;
  const toasts = signal<{ id: number; message: string; tone: 'success' | 'info' }[]>([]);

  beforeEach(async () => {
    dismiss = vi.fn();
    toasts.set([{ id: 1, message: 'Saved', tone: 'success' }]);

    await TestBed.configureTestingModule({
      imports: [ToastHost],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            toasts,
            dismiss,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastHost);
    fixture.detectChanges();
  });

  it('renders toast message', () => {
    expect(fixture.nativeElement.textContent).toContain('Saved');
  });

  it('dismisses toast on button click', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.dismiss');
    button.click();
    expect(dismiss).toHaveBeenCalledWith(1);
  });
});
