import { Component, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-toast-host',
  template: `
    <div class="toast-host" aria-live="polite" aria-relevant="additions">
      @for (toast of notifications.toasts(); track toast.id) {
        <div class="toast" [class.toast--success]="toast.tone === 'success'" role="status">
          <p>{{ toast.message }}</p>
          <button type="button" class="dismiss" (click)="notifications.dismiss(toast.id)" aria-label="Dismiss">
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-host {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 1000;
      display: grid;
      gap: 0.75rem;
      width: min(22rem, calc(100vw - 2.5rem));
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      background: var(--fg);
      color: var(--bg);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      line-height: 1.4;
      animation: toast-in 0.35s ease-out both;
      box-shadow: var(--elev-raised);
    }

    .toast--success {
      background: var(--accent);
      color: var(--accent-on);
    }

    .toast p {
      margin: 0;
      flex: 1;
    }

    .dismiss {
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
      opacity: 0.7;
      padding: 0;
    }

    .dismiss:hover {
      opacity: 1;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class ToastHost {
  readonly notifications = inject(NotificationService);
}
