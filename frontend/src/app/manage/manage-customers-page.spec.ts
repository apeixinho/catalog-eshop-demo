import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ManageCustomersPage } from './manage-customers-page';
import { AuthService } from '../auth/auth.service';
import { CatalogApiService } from '../shared/catalog-api.service';
import { CustomerSummary } from '../shared/models';

describe('ManageCustomersPage', () => {
  let fixture: ComponentFixture<ManageCustomersPage>;
  let component: ManageCustomersPage;
  let auth: { isAdmin: ReturnType<typeof vi.fn> };
  let api: {
    listManageCustomers: ReturnType<typeof vi.fn>;
    getManageCustomer: ReturnType<typeof vi.fn>;
    createAdminCustomer: ReturnType<typeof vi.fn>;
    updateAdminCustomer: ReturnType<typeof vi.fn>;
    deleteAdminCustomer: ReturnType<typeof vi.fn>;
  };

  let dialog: { open: ReturnType<typeof vi.fn> };

  const sample: CustomerSummary = {
    id: 5,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    orderCount: 0,
  };

  beforeEach(async () => {
    auth = { isAdmin: vi.fn().mockReturnValue(true) };
    api = {
      listManageCustomers: vi.fn().mockReturnValue(of({ content: [sample] })),
      getManageCustomer: vi.fn().mockReturnValue(
        of({
          ...sample,
          oauthSub: 'sub-jane',
          orders: [],
        }),
      ),
      createAdminCustomer: vi.fn().mockReturnValue(of(sample)),
      updateAdminCustomer: vi.fn().mockReturnValue(of(sample)),
      deleteAdminCustomer: vi.fn().mockReturnValue(of(void 0)),
    };

    dialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }),
    };

    await TestBed.configureTestingModule({
      imports: [ManageCustomersPage],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: auth },
        { provide: CatalogApiService, useValue: api },
      ],
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();

    fixture = TestBed.createComponent(ManageCustomersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads customers on init', () => {
    expect(api.listManageCustomers).toHaveBeenCalled();
    expect(component.customers()).toEqual([sample]);
    expect(component.loading()).toBe(false);
  });

  it('creates a customer when admin submits the form', () => {
    const payload = {
      firstName: 'New',
      lastName: 'User',
      email: 'new@example.com',
      oauthSub: 'sub-new',
    };
    component.form = payload;

    component.saveCustomer();

    expect(api.createAdminCustomer).toHaveBeenCalledWith(payload);
    expect(component.editingId()).toBeNull();
    expect(api.listManageCustomers.mock.calls.length).toBeGreaterThan(1);
  });

  it('updates a customer when editing', () => {
    const payload = {
      firstName: 'Jane',
      lastName: 'Updated',
      email: 'jane@example.com',
      oauthSub: 'sub-jane',
    };
    component.editingId.set(5);
    component.form = payload;

    component.saveCustomer();

    expect(api.updateAdminCustomer).toHaveBeenCalledWith(5, payload);
  });

  it('loads customer detail into the form when editing', () => {
    component.editCustomer(sample);

    expect(api.getManageCustomer).toHaveBeenCalledWith(5);
    expect(component.form.oauthSub).toBe('sub-jane');
    expect(component.editingId()).toBe(5);
  });

  it('does not save when user is not admin', () => {
    auth.isAdmin.mockReturnValue(false);

    component.saveCustomer();

    expect(api.createAdminCustomer).not.toHaveBeenCalled();
    expect(api.updateAdminCustomer).not.toHaveBeenCalled();
  });

  it('sets error when delete fails', () => {
    api.deleteAdminCustomer.mockReturnValue(throwError(() => new Error('conflict')));

    component.deleteCustomer(sample);

    expect(component.error()).toBeTruthy();
  });
});
