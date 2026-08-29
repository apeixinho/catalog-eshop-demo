export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  imageUrl: string;
  active: boolean;
  unitsInStock: number;
  category?: ProductCategory;
}

export interface ProductCategory {
  id: number;
  categoryName: string;
}

export interface Country {
  id: number;
  code: string;
  name: string;
}

export interface State {
  id: number;
  name: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface OrderSummary {
  id: number;
  orderTrackingNumber: string;
  status: OrderStatus;
  totalPrice: number;
  currencyCode: string;
  totalQuantity: number;
  dateCreated: string;
}

export interface OrderItem {
  productId: number;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
}

export interface CustomerSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  orderCount: number;
}

export interface OrderDetail extends OrderSummary {
  lastUpdated: string;
  paymentUrl: string | null;
  customer: CustomerSummary;
  items: OrderItem[];
}

export interface CustomerDetail extends CustomerSummary {
  oauthSub: string;
  orders: OrderSummary[];
}

export interface CustomerUpsert {
  firstName: string;
  lastName: string;
  email: string;
  oauthSub: string;
}

/** Spring Data page payload (flat or VIA_DTO nested `page` metadata). */
export interface Page<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  page?: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
