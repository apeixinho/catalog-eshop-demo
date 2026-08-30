import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ManageOrdersPage } from './manage-orders-page';
import { CatalogApiService } from '../shared/catalog-api.service';
import { OrderSummary } from '../shared/models';

describe('ManageOrdersPage', () => {
  let fixture: ComponentFixture<ManageOrdersPage>;
  let component: ManageOrdersPage;
  let api: {
    listManageOrders: ReturnType<typeof vi.fn>;
    updateManageOrder: ReturnType<typeof vi.fn>;
    deleteManageOrder: ReturnType<typeof vi.fn>;
  };

  const sampleOrder: OrderSummary = {
    id: 42,
    orderTrackingNumber: 'TRK-42',
    status: 'PENDING',
    totalPrice: 29.98,
    currencyCode: 'USD',
    totalQuantity: 2,
    dateCreated: '2026-08-30T00:00:00Z',
  };

  beforeEach(async () => {
    api = {
      listManageOrders: vi
        .fn()
        .mockReturnValue(of({ content: [sampleOrder] })),
      updateManageOrder: vi.fn(),
      deleteManageOrder: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ManageOrdersPage],
      providers: [
        provideRouter([]),
        { provide: CatalogApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageOrdersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads orders on init', () => {
    expect(api.listManageOrders).toHaveBeenCalled();
    expect(component.orders()).toEqual([sampleOrder]);
    expect(component.error()).toBeNull();
  });

  it('clears error after successful status save', () => {
    component.error.set('Previous error');
    api.updateManageOrder.mockReturnValue(
      of({ ...sampleOrder, status: 'CANCELLED' }),
    );

    component.startStatusEdit(sampleOrder);
    component.draftStatus = 'CANCELLED';
    component.saveStatusEdit(sampleOrder);

    expect(component.error()).toBeNull();
    expect(component.orders()[0].status).toBe('CANCELLED');
    expect(component.editingStatusId()).toBeNull();
  });

  it('opens confirm dialog for paid delete and deletes on confirm', () => {
    const paidOrder: OrderSummary = { ...sampleOrder, id: 99, status: 'PAID' };
    component.orders.set([paidOrder]);
    api.deleteManageOrder.mockReturnValue(of(void 0));

    component.deleteOrder(paidOrder);
    expect(component.confirmDeleteOrder()?.id).toBe(99);

    component.performDelete(paidOrder);
    expect(api.deleteManageOrder).toHaveBeenCalledWith(99);
    expect(component.orders()).toHaveLength(0);
  });

  it('reloads list after failed status save', () => {
    api.updateManageOrder.mockReturnValue(throwError(() => new Error('save failed')));
    const listCallsAfterInit = api.listManageOrders.mock.calls.length;

    component.startStatusEdit(sampleOrder);
    component.draftStatus = 'CANCELLED';
    component.saveStatusEdit(sampleOrder);

    expect(api.updateManageOrder).toHaveBeenCalledWith(42, 'CANCELLED');
    expect(api.listManageOrders.mock.calls.length).toBeGreaterThan(listCallsAfterInit);
  });

  it('deletes pending order immediately without confirm dialog', () => {
    api.deleteManageOrder.mockReturnValue(of(void 0));

    component.deleteOrder(sampleOrder);

    expect(component.confirmDeleteOrder()).toBeNull();
    expect(api.deleteManageOrder).toHaveBeenCalledWith(42);
  });

  it('cancelStatusEdit clears editing state', () => {
    component.startStatusEdit(sampleOrder);
    component.cancelStatusEdit();
    expect(component.editingStatusId()).toBeNull();
  });
});
