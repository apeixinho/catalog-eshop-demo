import { Injectable, computed, inject, signal, effect, untracked } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Product } from '../shared/models';
import { NotificationService } from '../shared/notification.service';
import { LocaleService } from '../i18n/locale.service';
import { CatalogApiService } from '../shared/catalog-api.service';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface PersistedCartLine {
  productId: number;
  quantity: number;
}

const STORAGE_KEY = 'catalog.cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cartItems = signal<CartItem[]>([]);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(LocaleService);
  private readonly api = inject(CatalogApiService);
  /** Avoid wiping localStorage before hydrateFromStorage finishes. */
  private persistReady = false;
  /** Bumped to discard in-flight hydrate after intentional cart mutations. */
  private hydrateGeneration = 0;

  readonly items = this.cartItems.asReadonly();
  readonly totalItems = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0),
  );
  readonly subtotal = computed(() => {
    this.i18n.currencyCode();
    return this.cartItems().reduce(
      (sum, item) => sum + this.i18n.lineTotal(Number(item.product.unitPrice), item.quantity),
      0,
    );
  });
  readonly isEmpty = computed(() => this.cartItems().length === 0);

  constructor() {
    this.hydrateFromStorage();

    effect(() => {
      const items = this.cartItems();
      if (!this.persistReady) {
        return;
      }
      this.writePersisted(items);
    });

    effect(() => {
      this.i18n.language();
      const items = untracked(() => this.cartItems());
      if (items.length === 0) {
        return;
      }
      this.refreshProducts(items.map((item) => item.product.id));
    });
  }

  addToCart(product: Product, quantity = 1): void {
    if (!product.active || product.unitsInStock <= 0) {
      this.notifications.info(this.i18n.t('toast.outOfStock'));
      return;
    }
    this.invalidatePendingHydrate();
    const items = [...this.cartItems()];
    const index = items.findIndex((item) => item.product.id === product.id);
    if (index >= 0) {
      const nextQty = Math.min(items[index].quantity + quantity, product.unitsInStock);
      items[index] = { ...items[index], product, quantity: nextQty };
    } else {
      items.push({ product, quantity: Math.min(quantity, product.unitsInStock) });
    }
    this.cartItems.set(items);
    this.notifications.success(this.i18n.t('toast.addedToCart', { name: product.name }));
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    this.invalidatePendingHydrate();
    this.cartItems.set(
      this.cartItems().map((item) => {
        if (item.product.id !== productId) {
          return item;
        }
        return {
          ...item,
          quantity: Math.min(quantity, item.product.unitsInStock || quantity),
        };
      }),
    );
  }

  removeFromCart(productId: number): void {
    this.invalidatePendingHydrate();
    this.cartItems.set(this.cartItems().filter((item) => item.product.id !== productId));
  }

  clearCart(): void {
    this.invalidatePendingHydrate();
    this.cartItems.set([]);
    // Persist immediately so a pending hydrate cannot leave stale lines in storage.
    this.writePersisted([]);
  }

  private invalidatePendingHydrate(): void {
    this.hydrateGeneration++;
    this.persistReady = true;
  }

  private hydrateFromStorage(attempt = 0): void {
    const lines = this.readPersisted();
    if (lines.length === 0) {
      this.persistReady = true;
      return;
    }

    const generation = this.hydrateGeneration;
    forkJoin(
      lines.map((line) =>
        this.api.getProduct(line.productId).pipe(catchError(() => of(null))),
      ),
    ).subscribe((products) => {
      if (generation !== this.hydrateGeneration) {
        return;
      }

      const next: CartItem[] = [];
      let fetchFailures = 0;
      for (let i = 0; i < lines.length; i++) {
        const product = products[i];
        const line = lines[i];
        if (!product) {
          fetchFailures++;
          continue;
        }
        if (!product.active || product.unitsInStock <= 0) {
          continue;
        }
        next.push({
          product,
          quantity: Math.min(line.quantity, product.unitsInStock),
        });
      }

      // All product GETs failed (network/CORS/boot race). Keep localStorage intact
      // and retry once — never persist an empty cart from a failed hydrate.
      if (next.length === 0 && fetchFailures === lines.length) {
        if (attempt < 1) {
          window.setTimeout(() => {
            if (generation === this.hydrateGeneration && !this.persistReady) {
              this.hydrateFromStorage(attempt + 1);
            }
          }, 750);
        }
        // Leave persistReady false so the empty in-memory cart is not written.
        return;
      }

      this.cartItems.set(next);
      this.persistReady = true;
    });
  }

  private refreshProducts(ids: number[]): void {
    forkJoin(ids.map((id) => this.api.getProduct(id).pipe(catchError(() => of(null))))).subscribe(
      (products) => {
        const byId = new Map(
          products.filter((p): p is Product => p != null).map((p) => [p.id, p]),
        );
        this.cartItems.update((current) =>
          current.flatMap((item) => {
            const fresh = byId.get(item.product.id);
            if (!fresh) {
              return [item];
            }
            if (!fresh.active || fresh.unitsInStock <= 0) {
              return [];
            }
            return [
              {
                quantity: Math.min(item.quantity, fresh.unitsInStock),
                product: fresh,
              },
            ];
          }),
        );
      },
    );
  }

  private readPersisted(): PersistedCartLine[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((entry) => {
          if (
            entry == null ||
            typeof entry !== 'object' ||
            !('productId' in entry) ||
            !('quantity' in entry)
          ) {
            return null;
          }
          const productId = Number((entry as PersistedCartLine).productId);
          const quantity = Number((entry as PersistedCartLine).quantity);
          if (!Number.isFinite(productId) || !Number.isFinite(quantity) || quantity <= 0) {
            return null;
          }
          return { productId, quantity: Math.floor(quantity) };
        })
        .filter((line): line is PersistedCartLine => line != null);
    } catch {
      return [];
    }
  }

  private writePersisted(items: CartItem[]): void {
    const lines: PersistedCartLine[] = items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }
}
