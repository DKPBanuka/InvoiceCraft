
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'staff';

export interface AuthUser {
  uid: string;
  email: string | null;
  username: string;
  role: UserRole;
}

export type ItemStatus = 'Available' | 'Awaiting Inspection' | 'Damaged' | 'For Repair';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price: number; // Selling price
  costPrice: number;
  reorderPoint: number;
  status: ItemStatus;
  warrantyPeriod: string;
  createdAt: string; // Storing as ISO string on client, but can be Timestamp from server
}

export interface LineItem {
  id: string;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  price: number;
  warrantyPeriod: string;
}

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Cancelled';

export interface Invoice {
  id:string; // The invoice number, e.g., "INV-2024-0001"
  customerName: string;
  customerPhone?: string;
  status: InvoiceStatus;
  createdAt: string; // ISO string
  lineItems: LineItem[];
  discount: number; // Percentage discount
  createdBy: string; // User UID
  createdByName: string;
}

export type ReturnStatus = 'Awaiting Inspection' | 'Under Repair' | 'Ready for Pickup' | 'To be Replaced' | 'To be Refunded' | 'Return to Supplier' | 'Completed / Closed';
export type ReturnType = 'Customer Return' | 'Supplier Return';

export interface ReturnItem {
  id: string; // internal UUID
  returnId: string; // e.g. RTN-2024-0001
  type: ReturnType;
  status: ReturnStatus;
  customerName: string;
  customerPhone?: string;
  inventoryItemId: string;
  inventoryItemName: string;
  originalInvoiceId?: string;
  quantity: number;
  reason: string;
  notes?: string;
  createdAt: string; // ISO string
  resolutionDate?: string; // ISO string
  createdBy: string; // User UID
  createdByName: string;
}
