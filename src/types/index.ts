export type UUID = string;

export type Unit = "un" | "kg" | "lt" | "m" | "kit";

export interface KitComponent {
  product_id: UUID;
  quantity: number;
}

export interface Product {
  id: UUID;
  store_id: UUID;
  name: string;
  description?: string | null;
  barcode?: string | null;
  sku?: string | null;
  ncm?: string | null;
  price: number;
  cost?: number | null;
  stock: number;
  min_stock: number;
  unit: Unit | string;
  category: string;
  expires_at?: string | null;
  image_url?: string | null;
  catalog_visible: boolean;
  kit_components: KitComponent[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: UUID;
  sale_id: UUID;
  product_id: UUID;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  line_profit: number;
}

export type SaleStatus = "completed" | "pending_sync" | "synced" | "draft";
export type PaymentMethod = "cash" | "card" | "pix" | "credit";

export interface Sale {
  id: UUID;
  store_id: UUID;
  shift_id?: UUID | null;
  customer_id?: UUID | null;
  customer_name?: string | null;
  total: number;
  cost_total: number;
  profit: number;
  discount?: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  sync_pending: boolean;
  items: SaleItem[];
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: UUID;
  store_id: UUID;
  name: string;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
  created_at: string;
}

export type MovementType = "entry" | "exit" | "adjustment" | "kit";

export interface InventoryMovement {
  id: UUID;
  product_id: UUID;
  type: MovementType;
  quantity: number;
  reason: string;
  reference_id?: UUID | null;
  created_at: string;
}

export interface Store {
  id: UUID;
  name: string;
  plan: "free" | "pro" | "enterprise";
  catalog_enabled: boolean;
  created_at: string;
}

export interface PendingSync {
  id: UUID;
  table: string;
  action: "insert" | "update" | "delete";
  payload: unknown;
  created_at: string;
  attempts: number;
}

export type ShiftStatus = "open" | "closed";

export interface CashShift {
  id: UUID;
  store_id: UUID;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  difference: number | null;
  cash_sales: number;
  other_sales: number;
  status: ShiftStatus;
  notes?: string | null;
}

export interface MetricsSummary {
  total_revenue: number;
  total_sales: number;
  avg_ticket: number;
  profit: number;
  stock_critical: number;
  stock_low: number;
  pending_sync: number;
  top_products: Array<{ name: string; sold: number; revenue: number }>;
  daily_series: Array<{ date: string; revenue: number; sales: number; profit: number }>;
  critical_products: Array<{ name: string; stock: number; min_stock: number }>;
}

export interface NfeItem {
  name: string;
  ncm: string | null;
  barcode: string | null;
  quantity: number;
  unit_cost: number;
  unit: string;
}
