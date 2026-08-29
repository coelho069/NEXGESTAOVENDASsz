/**
 * FluxoGestão — IndexedDB data layer (local-first, Supabase-shaped)
 *
 * Writes always land here first. Offline sales queue in `pending_sync`
 * and flush into `remote_sales` with simulated latency when online.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CashShift,
  Customer,
  InventoryMovement,
  MetricsSummary,
  NfeItem,
  PendingSync,
  Product,
  Sale,
  SaleItem,
  Store,
  UUID,
} from "@/types";
import { uuid, sleep } from "@/lib/utils";
import { parseNfeXml, SAMPLE_NFE_XML } from "@/lib/nfe";
import { supabase, isCloudConfigured } from "@/lib/supabase";

const DB_NAME = "fluxogestao-db-v3";
const DB_VERSION = 1;
export const XML_SAMPLE = SAMPLE_NFE_XML;
export const STORE_ID = "store-1";

export interface FGSchema extends DBSchema {
  stores: { key: string; value: Store };
  products: {
    key: string;
    value: Product;
    indexes: { store_id: string; category: string };
  };
  sales: {
    key: string;
    value: Sale;
    indexes: { store_id: string; status: string; created_at: string };
  };
  sale_items: { key: string; value: SaleItem; indexes: { sale_id: string } };
  customers: { key: string; value: Customer; indexes: { store_id: string } };
  inventory_movements: {
    key: string;
    value: InventoryMovement;
    indexes: { product_id: string };
  };
  pending_sync: { key: string; value: PendingSync };
  remote_sales: { key: string; value: Sale };
  cash_shifts: {
    key: string;
    value: CashShift;
    indexes: { store_id: string; status: string };
  };
}

let instance: Promise<IDBPDatabase<FGSchema>> | null = null;

function getDB() {
  if (!instance) {
    instance = openDB<FGSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("stores")) {
          db.createObjectStore("stores", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("products")) {
          const s = db.createObjectStore("products", { keyPath: "id" });
          s.createIndex("store_id", "store_id");
          s.createIndex("category", "category");
        }
        if (!db.objectStoreNames.contains("sales")) {
          const s = db.createObjectStore("sales", { keyPath: "id" });
          s.createIndex("store_id", "store_id");
          s.createIndex("status", "status");
          s.createIndex("created_at", "created_at");
        }
        if (!db.objectStoreNames.contains("sale_items")) {
          const s = db.createObjectStore("sale_items", { keyPath: "id" });
          s.createIndex("sale_id", "sale_id");
        }
        if (!db.objectStoreNames.contains("customers")) {
          const s = db.createObjectStore("customers", { keyPath: "id" });
          s.createIndex("store_id", "store_id");
        }
        if (!db.objectStoreNames.contains("inventory_movements")) {
          const s = db.createObjectStore("inventory_movements", { keyPath: "id" });
          s.createIndex("product_id", "product_id");
        }
        if (!db.objectStoreNames.contains("pending_sync")) {
          db.createObjectStore("pending_sync", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("remote_sales")) {
          db.createObjectStore("remote_sales", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("cash_shifts")) {
          const s = db.createObjectStore("cash_shifts", { keyPath: "id" });
          s.createIndex("store_id", "store_id");
          s.createIndex("status", "status");
        }
      },
    });
  }
  return instance;
}

function isoNow() {
  return new Date().toISOString();
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function daysAgo(n: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, n * 7 % 60, 0, 0);
  return d.toISOString();
}

const img = (id: string, q = "grocery") =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=70&${q}`;

const SEED_PRODUCTS: Array<Omit<Product, "min_stock" | "kit_components" | "ncm">> = [
  {
    id: "prod-cafe",
    store_id: STORE_ID,
    name: "Café 100% Arábica Torrado 500g",
    description: "Torrado escuro, moído na hora. Origem Sul de Minas.",
    price: 28.9,
    cost: 12.5,
    stock: 42,
    unit: "un",
    category: "Bebidas",
    barcode: "7890000000011",
    sku: "CAF-500",
    image_url: img("photo-1447933601403-0c6688de566e"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(40),
    updated_at: daysAgo(1),
  },
  {
    id: "prod-leite",
    store_id: STORE_ID,
    name: "Leite Integral UHT 1L",
    description: "Leite integral longa vida.",
    price: 7.45,
    cost: 4.1,
    stock: 8,
    unit: "un",
    category: "Laticínios",
    barcode: "7890000000028",
    sku: "LEI-1L",
    expires_at: daysFromNow(6),
    image_url: img("photo-1563636619-e91b3755343e"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(20),
    updated_at: daysAgo(0),
  },
  {
    id: "prod-pao",
    store_id: STORE_ID,
    name: "Pão Francês (Unidade)",
    description: "Fornos das 5h. Crocante por fora.",
    price: 1.8,
    cost: 0.9,
    stock: 5,
    unit: "un",
    category: "Padaria",
    barcode: "7890000000035",
    sku: "PAO-UN",
    expires_at: daysFromNow(1),
    image_url: img("photo-1509440159596-0249088772ff"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(2),
    updated_at: daysAgo(0),
  },
  {
    id: "prod-azeite",
    store_id: STORE_ID,
    name: "Azeite Extra Virgem 500ml",
    description: "Acidez 0,2%. Extraído a frio.",
    price: 46.9,
    cost: 28.0,
    stock: 19,
    unit: "un",
    category: "Mercearia",
    barcode: "7890000000042",
    sku: "AZE-500",
    image_url: img("photo-1474979266404-7eaacbcd87c5"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(30),
    updated_at: daysAgo(4),
  },
  {
    id: "prod-acucar",
    store_id: STORE_ID,
    name: "Açúcar Refinado 1kg",
    price: 5.99,
    cost: 3.2,
    stock: 2,
    unit: "un",
    category: "Mercearia",
    barcode: "7890000000059",
    sku: "ACU-1K",
    image_url: img("photo-1558642452-9d2a7deb7f62"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(18),
    updated_at: daysAgo(1),
  },
  {
    id: "prod-macarrao",
    store_id: STORE_ID,
    name: "Espaguete Grano Duro 500g",
    price: 4.89,
    cost: 2.6,
    stock: 31,
    unit: "un",
    category: "Mercearia",
    barcode: "7890000000066",
    sku: "MAC-500",
    image_url: img("photo-1551462147-37885add8e21"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(22),
    updated_at: daysAgo(3),
  },
  {
    id: "prod-molho",
    store_id: STORE_ID,
    name: "Molho de Tomate Orgânico 350g",
    price: 9.9,
    cost: 5.5,
    stock: 12,
    unit: "un",
    category: "Mercearia",
    barcode: "7890000000073",
    sku: "MOL-350",
    expires_at: daysFromNow(40),
    image_url: img("photo-1472476443507-c7a9ba75bb0a"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(12),
    updated_at: daysAgo(2),
  },
  {
    id: "prod-queijo",
    store_id: STORE_ID,
    name: "Mussarela Fatiada 500g",
    price: 24.9,
    cost: 16.4,
    stock: 6,
    unit: "un",
    category: "Laticínios",
    barcode: "7890000000080",
    sku: "QUE-500",
    expires_at: daysFromNow(4),
    image_url: img("photo-1486297678162-eb2a19b0a32d"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(8),
    updated_at: daysAgo(0),
  },
  {
    id: "prod-presunto",
    store_id: STORE_ID,
    name: "Presunto Cozido 200g",
    price: 12.5,
    cost: 7.8,
    stock: 3,
    unit: "un",
    category: "Frios",
    barcode: "7890000000097",
    sku: "PRE-200",
    expires_at: daysFromNow(2),
    image_url: img("photo-1615937657715-bc7b4b7962c1"),
    catalog_visible: false,
    active: true,
    created_at: daysAgo(6),
    updated_at: daysAgo(0),
  },
  {
    id: "prod-cerveja",
    store_id: STORE_ID,
    name: "Cerveja Pilsen 330ml (6-pack)",
    price: 32.0,
    cost: 19.0,
    stock: 15,
    unit: "un",
    category: "Bebidas",
    barcode: "7890000000103",
    sku: "CER-6PK",
    image_url: img("photo-1608270586620-248524c67de9"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(14),
    updated_at: daysAgo(1),
  },
  {
    id: "prod-sabao",
    store_id: STORE_ID,
    name: "Detergente Neutro 500ml",
    price: 3.49,
    cost: 1.6,
    stock: 23,
    unit: "un",
    category: "Limpeza",
    barcode: "7890000000110",
    sku: "DET-500",
    image_url: img("photo-1563453392212-326f5e854473"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(25),
    updated_at: daysAgo(5),
  },
  {
    id: "prod-creme",
    store_id: STORE_ID,
    name: "Creme Dental Menta 90g",
    price: 8.9,
    cost: 4.2,
    stock: 0,
    unit: "un",
    category: "Higiene",
    barcode: "7890000000127",
    sku: "CRE-90",
    image_url: img("photo-1559591935-c6c92c6c2c6f"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(16),
    updated_at: daysAgo(0),
  },
  {
    id: "prod-capsulas",
    store_id: STORE_ID,
    name: "Café em Cápsulas (10 un)",
    price: 22.9,
    cost: 13.0,
    stock: 14,
    unit: "un",
    category: "Bebidas",
    barcode: "7890000000134",
    sku: "CAP-10",
    image_url: img("photo-1511920170033-f8396924c348"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(9),
    updated_at: daysAgo(2),
  },
  {
    id: "prod-chocolate",
    store_id: STORE_ID,
    name: "Chocolate ao Leite 90g",
    price: 6.5,
    cost: 3.1,
    stock: 27,
    unit: "un",
    category: "Doces",
    barcode: "7890000000141",
    sku: "CHO-90",
    image_url: img("photo-1511381939415-e44015466831"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(11),
    updated_at: daysAgo(1),
  },
  {
    id: "prod-cereal",
    store_id: STORE_ID,
    name: "Granola Crocante 400g",
    price: 19.9,
    cost: 11.0,
    stock: 9,
    unit: "un",
    category: "Mercearia",
    barcode: "7890000000158",
    sku: "GRA-400",
    expires_at: daysFromNow(90),
    image_url: img("photo-1517673132405-a56a62b18baf"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(19),
    updated_at: daysAgo(3),
  },
  {
    id: "prod-cebola",
    store_id: STORE_ID,
    name: "Cebola Roxa 1kg",
    price: 8.5,
    cost: 4.5,
    stock: 0,
    unit: "kg",
    category: "Hortifruti",
    barcode: "7890000000165",
    sku: "CEB-1K",
    expires_at: daysFromNow(8),
    image_url: img("photo-1508747703725-719777637510"),
    catalog_visible: false,
    active: true,
    created_at: daysAgo(3),
    updated_at: daysAgo(0),
  },
  {
    id: "prod-alcatra",
    store_id: STORE_ID,
    name: "Alcatra Bovina (kg)",
    price: 36.99,
    cost: 27.0,
    stock: 7,
    unit: "kg",
    category: "Açougue",
    barcode: "7890000000172",
    sku: "ALC-KG",
    expires_at: daysFromNow(3),
    image_url: img("photo-1603048297172-c925047619c0"),
    catalog_visible: false,
    active: true,
    created_at: daysAgo(1),
    updated_at: daysAgo(0),
  },
  {
    id: "prod-agua",
    store_id: STORE_ID,
    name: "Água Mineral Sem Gás 500ml",
    price: 3.2,
    cost: 1.6,
    stock: 60,
    unit: "un",
    category: "Bebidas",
    barcode: "7890000000189",
    sku: "AGU-500",
    image_url: img("photo-1548839140-29a749e1cf4d"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(28),
    updated_at: daysAgo(2),
  },
  {
    id: "prod-iogurte",
    store_id: STORE_ID,
    name: "Iogurte Natural 170g",
    price: 4.2,
    cost: 2.1,
    stock: 4,
    unit: "un",
    category: "Laticínios",
    barcode: "7890000000196",
    sku: "IOG-170",
    expires_at: daysFromNow(5),
    image_url: img("photo-1488477181946-6428a0291777"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(5),
    updated_at: daysAgo(0),
  },
  {
    id: "prod-arroz",
    store_id: STORE_ID,
    name: "Arroz Agulhinha Tipo 1 5kg",
    price: 27.9,
    cost: 18.4,
    stock: 18,
    unit: "un",
    category: "Mercearia",
    barcode: "7890000000202",
    sku: "ARR-5K",
    image_url: img("photo-1586201375761-83865001e31c"),
    catalog_visible: true,
    active: true,
    created_at: daysAgo(15),
    updated_at: daysAgo(4),
  },
];

const SEED_CUSTOMERS: Customer[] = [
  {
    id: "cus-ana",
    store_id: STORE_ID,
    name: "Ana Silva",
    phone: "(11) 98765-4321",
    email: "ana.silva@email.com",
    cpf: "123.456.789-00",
    created_at: daysAgo(60),
  },
  {
    id: "cus-bruno",
    store_id: STORE_ID,
    name: "Bruno Costa",
    phone: "(11) 91234-5678",
    email: "bruno.c@email.com",
    cpf: "987.654.321-00",
    created_at: daysAgo(40),
  },
  {
    id: "cus-lucia",
    store_id: STORE_ID,
    name: "Lúcia Ferreira",
    phone: "(11) 99876-1100",
    email: "lucia.f@email.com",
    cpf: "321.654.987-00",
    created_at: daysAgo(20),
  },
];

function money(n: number) {
  return Math.round(n * 100) / 100;
}

async function pushProductCloud(p: Product) {
  if (!isCloudConfigured() || !supabase) return;
  await supabase.from("products").upsert({
    id: p.id,
    store_id: p.store_id,
    name: p.name,
    description: p.description,
    cost_price: p.cost,
    sale_price: p.price,
    cost: p.cost,
    price: p.price,
    stock_quantity: p.stock,
    stock: p.stock,
    min_stock: p.min_stock,
    category: p.category,
    image_url: p.image_url,
    catalog_visible: p.catalog_visible,
    active: p.active,
    updated_at: p.updated_at,
  });
}

function hydrateProduct(p: Product): Product {
  return {
    ...p,
    min_stock: p.min_stock ?? 5,
    kit_components: p.kit_components ?? [],
    ncm: p.ncm ?? null,
  };
}

export function effectiveStock(p: Product, all: Product[]): number {
  const kit = p.kit_components ?? [];
  if (p.unit !== "kit" && kit.length === 0) return p.stock;
  if (kit.length === 0) return p.stock;
  const caps = kit.map((c) => {
    const child = all.find((x) => x.id === c.product_id);
    if (!child || c.quantity <= 0) return 0;
    return Math.floor(child.stock / c.quantity);
  });
  return Math.max(0, Math.min(...caps));
}

export const db = {
  async isSeeded() {
    const store = await getDB();
    return (await store.count("products")) >= SEED_PRODUCTS.length;
  },

  async seed() {
    const store = await getDB();
    const tx = store.transaction(
      [
        "stores",
        "products",
        "customers",
        "sales",
        "sale_items",
        "remote_sales",
        "inventory_movements",
      ],
      "readwrite"
    );

    await tx.objectStore("stores").put({
      id: STORE_ID,
      name: "Mercado Demo • FluxoGestão",
      plan: "pro",
      catalog_enabled: true,
      created_at: daysAgo(90),
    });

    for (const p of SEED_PRODUCTS) {
      await tx.objectStore("products").put(
        hydrateProduct({
          ...p,
          min_stock: p.stock <= 5 ? 6 : 8,
          kit_components: [],
        } as Product)
      );
    }
    const kit: Product = hydrateProduct({
      id: "prod-kit-cafe",
      store_id: STORE_ID,
      name: "Kit Café da Manhã",
      description: "1 café + 2 pães + 1 leite. Baixa os três no estoque.",
      price: 38.9,
      cost: 16.2,
      stock: 0,
      min_stock: 3,
      unit: "kit",
      category: "Kits",
      barcode: "KIT-CAFE-01",
      sku: "KIT-CAFE",
      ncm: null,
      catalog_visible: true,
      kit_components: [
        { product_id: "prod-cafe", quantity: 1 },
        { product_id: "prod-pao", quantity: 2 },
        { product_id: "prod-leite", quantity: 1 },
      ],
      active: true,
      created_at: daysAgo(2),
      updated_at: daysAgo(0),
    } as Product);
    await tx.objectStore("products").put(kit);
    for (const c of SEED_CUSTOMERS) await tx.objectStore("customers").put(c);

    const methods: Sale["payment_method"][] = ["pix", "card", "cash", "pix", "card"];
    const names = ["Ana Silva", "Bruno Costa", "Lúcia Ferreira", null, "Ana Silva"];

    for (let i = 0; i < 24; i++) {
      const p = SEED_PRODUCTS[i % SEED_PRODUCTS.length];
      const qty = 1 + (i % 3);
      const saleId = `sale-seed-${i}`;
      const created = daysAgo(i % 7, 8 + (i % 10));
      const total = money(p.price * qty);
      const unit_cost = p.cost ?? money(p.price * 0.55);
      const item: SaleItem = {
        id: `${saleId}-i0`,
        sale_id: saleId,
        product_id: p.id,
        product_name: p.name,
        quantity: qty,
        unit_price: p.price,
        unit_cost,
        total_price: total,
        line_profit: money(total - unit_cost * qty),
      };
      const sale: Sale = {
        id: saleId,
        store_id: STORE_ID,
        customer_id: null,
        customer_name: names[i % names.length],
        total,
        cost_total: money(unit_cost * qty),
        profit: item.line_profit,
        discount: 0,
        payment_method: methods[i % methods.length],
        status: "synced",
        sync_pending: false,
        items: [],
        created_at: created,
        updated_at: created,
      };
      await tx.objectStore("sales").put(sale);
      await tx.objectStore("remote_sales").put(sale);
      await tx.objectStore("sale_items").put(item);
    }

    await tx.done;
  },

  async getStore(): Promise<Store> {
    const store = await getDB();
    const row = await store.get("stores", STORE_ID);
    return (
      row ?? {
        id: STORE_ID,
        name: "Mercado Demo • FluxoGestão",
        plan: "pro",
        catalog_enabled: true,
        created_at: isoNow(),
      }
    );
  },

  async setCatalogEnabled(on: boolean): Promise<Store> {
    const store = await getDB();
    const current = await this.getStore();
    const next = { ...current, catalog_enabled: on };
    await store.put("stores", next);
    return next;
  },

  async getProducts(): Promise<Product[]> {
    const store = await getDB();
    const all = (await store.getAllFromIndex("products", "store_id", STORE_ID)).map(hydrateProduct);
    return all
      .filter((p) => p.active)
      .map((p) => {
        const kit = p.kit_components ?? [];
        if (kit.length === 0) return p;
        return { ...p, stock: effectiveStock(p, all) };
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  },

  async listAllProducts(): Promise<Product[]> {
    const store = await getDB();
    return (await store.getAll("products")).map(hydrateProduct);
  },

  async patchSale(id: UUID, patch: Partial<Sale>): Promise<Sale> {
    const store = await getDB();
    const current = await store.get("sales", id);
    if (!current) throw new Error("Venda não encontrada");
    const next = { ...current, ...patch, updated_at: isoNow() };
    await store.put("sales", next);
    return next;
  },

  async getCatalogProducts(): Promise<Product[]> {
    const products = await this.getProducts();
    return products.filter((p) => p.catalog_visible);
  },

  async createProduct(input: Partial<Product> & { name: string; price: number }): Promise<Product> {
    const store = await getDB();
    const now = isoNow();
    const product = hydrateProduct({
      id: uuid(),
      store_id: STORE_ID,
      name: input.name,
      description: input.description ?? null,
      barcode: input.barcode ?? null,
      sku: input.sku ?? null,
      ncm: input.ncm ?? null,
      price: input.price,
      cost: input.cost ?? 0,
      stock: input.stock ?? 0,
      min_stock: input.min_stock ?? 5,
      unit: input.unit ?? "un",
      category: input.category ?? "Geral",
      expires_at: input.expires_at ?? null,
      image_url: input.image_url ?? null,
      catalog_visible: input.catalog_visible ?? true,
      kit_components: input.kit_components ?? [],
      active: true,
      created_at: now,
      updated_at: now,
    } as Product);
    await store.put("products", product);
    await pushProductCloud(product);
    return product;
  },

  async updateProduct(id: UUID, patch: Partial<Product>): Promise<Product> {
    const store = await getDB();
    const current = await store.get("products", id);
    if (!current) throw new Error("Produto não encontrado");
    const next = { ...current, ...patch, updated_at: isoNow() };
    await store.put("products", next);
    await pushProductCloud(next);
    return next;
  },

  async deleteProduct(id: UUID): Promise<void> {
    const store = await getDB();
    const current = await store.get("products", id);
    if (!current) return;
    const next = { ...current, active: false, catalog_visible: false, updated_at: isoNow() };
    await store.put("products", next);
    if (isCloudConfigured() && supabase) {
      await supabase.from("products").update({ active: false, catalog_visible: false }).eq("id", id);
    }
  },

  async getCustomers(): Promise<Customer[]> {
    const store = await getDB();
    return store.getAllFromIndex("customers", "store_id", STORE_ID);
  },

  async getSales(): Promise<Sale[]> {
    const store = await getDB();
    const rows = await store.getAllFromIndex("sales", "store_id", STORE_ID);
    const withItems: Sale[] = [];
    for (const s of rows) {
      const items = await store.getAllFromIndex("sale_items", "sale_id", s.id);
      withItems.push({ ...s, items });
    }
    return withItems.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async createSale(input: {
    customer_name?: string;
    customer_id?: UUID | null;
    items: Array<{ product_id: UUID; quantity: number }>;
    payment_method: Sale["payment_method"];
    online?: boolean;
  }): Promise<Sale> {
    const store = await getDB();
    const now = isoNow();
    const saleId = uuid();
    const openShift = (await store.getAllFromIndex("cash_shifts", "status", "open"))[0] as
      | CashShift
      | undefined;
    const tx = store.transaction(
      ["products", "sales", "sale_items", "inventory_movements", "pending_sync", "cash_shifts"],
      "readwrite"
    );
    const productsStore = tx.objectStore("products");

    const builtItems: SaleItem[] = [];
    let total = 0;
    let cost_total = 0;

    const decrement = async (product: Product, qty: number, reason: string, type: InventoryMovement["type"]) => {
      const current = (await productsStore.get(product.id)) ?? product;
      if (current.stock < qty && (current.kit_components?.length ?? 0) === 0) {
        throw new Error(`Estoque insuficiente: ${current.name}`);
      }
      await productsStore.put({
        ...current,
        stock: Math.max(0, current.stock - qty),
        updated_at: now,
      });
      await tx.objectStore("inventory_movements").add({
        id: uuid(),
        product_id: current.id,
        type,
        quantity: qty,
        reason,
        reference_id: saleId,
        created_at: now,
      });
    };

    for (const it of input.items) {
      const product = hydrateProduct((await productsStore.get(it.product_id)) as Product);
      if (!product) throw new Error(`Produto não encontrado: ${it.product_id}`);
      if (it.quantity <= 0) continue;

      const kit = product.kit_components ?? [];
      if (kit.length > 0) {
        for (const c of kit) {
          const child = await productsStore.get(c.product_id);
          if (!child) throw new Error("Componente do kit ausente");
          const need = c.quantity * it.quantity;
          if (child.stock < need) {
            throw new Error(`Kit incompleto: falta ${child.name}`);
          }
        }
        for (const c of kit) {
          const child = (await productsStore.get(c.product_id)) as Product;
          await decrement(child, c.quantity * it.quantity, `baixa kit ${product.name}`, "kit");
        }
      } else {
        if (product.stock < it.quantity) {
          throw new Error(`Estoque insuficiente: ${product.name}`);
        }
        await decrement(product, it.quantity, "venda", "exit");
      }

      const unit_cost = product.cost ?? 0;
      const total_price = money(product.price * it.quantity);
      const line_profit = money(total_price - unit_cost * it.quantity);
      builtItems.push({
        id: uuid(),
        sale_id: saleId,
        product_id: product.id,
        product_name: product.name,
        quantity: it.quantity,
        unit_price: product.price,
        unit_cost,
        total_price,
        line_profit,
      });
      total += total_price;
      cost_total += unit_cost * it.quantity;
    }

    if (builtItems.length === 0) throw new Error("Carrinho vazio");

    const sale: Sale = {
      id: saleId,
      store_id: STORE_ID,
      shift_id: openShift?.id ?? null,
      customer_id: input.customer_id ?? null,
      customer_name: input.customer_name ?? null,
      total: money(total),
      cost_total: money(cost_total),
      profit: money(total - cost_total),
      discount: 0,
      payment_method: input.payment_method,
      status: "pending_sync",
      sync_pending: true,
      items: [],
      created_at: now,
      updated_at: now,
    };

    await tx.objectStore("sales").add(sale);
    for (const i of builtItems) await tx.objectStore("sale_items").add(i);
    await tx.objectStore("pending_sync").add({
      id: uuid(),
      table: "sales",
      action: "insert",
      payload: { ...sale, items: builtItems },
      created_at: now,
      attempts: 0,
    });

    if (openShift && input.payment_method === "cash") {
      await tx.objectStore("cash_shifts").put({
        ...openShift,
        cash_sales: money((openShift.cash_sales ?? 0) + sale.total),
      });
    } else if (openShift) {
      await tx.objectStore("cash_shifts").put({
        ...openShift,
        other_sales: money((openShift.other_sales ?? 0) + sale.total),
      });
    }

    await tx.done;
    return { ...sale, items: builtItems };
  },

  async applyNfeItems(items: NfeItem[]): Promise<{ products: number; units: number; created: number }> {
    const store = await getDB();
    const now = isoNow();
    const all = await store.getAll("products");
    const tx = store.transaction(["products", "inventory_movements"], "readwrite");
    let units = 0;
    let created = 0;
    for (const item of items) {
      let product = item.barcode
        ? all.find((p) => p.barcode === item.barcode)
        : all.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
      if (!product) {
        product = hydrateProduct({
          id: uuid(),
          store_id: STORE_ID,
          name: item.name,
          ncm: item.ncm,
          barcode: item.barcode,
          price: money(item.unit_cost * 1.4),
          cost: item.unit_cost,
          stock: 0,
          min_stock: 5,
          unit: item.unit,
          category: "Entrada NF-e",
          catalog_visible: true,
          kit_components: [],
          active: true,
          created_at: now,
          updated_at: now,
        } as Product);
        created++;
        all.push(product);
      }
      const next = hydrateProduct({
        ...product,
        stock: product.stock + item.quantity,
        cost: item.unit_cost || product.cost,
        ncm: item.ncm ?? product.ncm,
        updated_at: now,
      });
      await tx.objectStore("products").put(next);
      await tx.objectStore("inventory_movements").add({
        id: uuid(),
        product_id: next.id,
        type: "entry",
        quantity: item.quantity,
        reason: "entrada XML / NF-e",
        reference_id: null,
        created_at: now,
      });
      units += item.quantity;
    }
    await tx.done;
    return { products: items.length, units, created };
  },

  async importXml(xml?: string): Promise<{ products: number; units: number; created?: number }> {
    const items = parseNfeXml(xml ?? SAMPLE_NFE_XML);
    return this.applyNfeItems(items);
  },

  async getOpenShift(): Promise<CashShift | null> {
    const store = await getDB();
    const open = await store.getAllFromIndex("cash_shifts", "status", "open");
    return open[0] ?? null;
  },

  async getShifts(): Promise<CashShift[]> {
    const store = await getDB();
    const all = await store.getAllFromIndex("cash_shifts", "store_id", STORE_ID);
    return all.sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
  },

  async openShift(opening_cash: number): Promise<CashShift> {
    const store = await getDB();
    const existing = await this.getOpenShift();
    if (existing) throw new Error("Já existe um turno aberto. Feche-o antes.");
    const shift: CashShift = {
      id: uuid(),
      store_id: STORE_ID,
      opened_at: isoNow(),
      closed_at: null,
      opening_cash: money(opening_cash),
      closing_cash: null,
      expected_cash: null,
      difference: null,
      cash_sales: 0,
      other_sales: 0,
      status: "open",
    };
    await store.put("cash_shifts", shift);
    return shift;
  },

  async closeShift(closing_cash: number, notes?: string): Promise<CashShift> {
    const store = await getDB();
    const open = await this.getOpenShift();
    if (!open) throw new Error("Nenhum turno aberto.");
    const expected = money(open.opening_cash + open.cash_sales);
    const counted = money(closing_cash);
    const closed: CashShift = {
      ...open,
      closed_at: isoNow(),
      closing_cash: counted,
      expected_cash: expected,
      difference: money(counted - expected),
      status: "closed",
      notes: notes ?? null,
    };
    await store.put("cash_shifts", closed);
    return closed;
  },
};

export async function getPendingCount(): Promise<number> {
  const store = await getDB();
  return store.count("pending_sync");
}

export type SyncProgress = { done: number; total: number };

export async function syncPending(
  onProgress?: (p: SyncProgress) => void
): Promise<{ synced: number; online: boolean; cloud: boolean }> {
  const store = await getDB();
  const queue = await store.getAll("pending_sync");
  const cloud = isCloudConfigured();
  if (queue.length === 0) return { synced: 0, online: true, cloud };
  onProgress?.({ done: 0, total: queue.length });

  let synced = 0;
  for (const [i, entry] of queue.entries()) {
    await sleep(180 + Math.random() * 220);
    try {
      const payload = entry.payload as Sale;
      if (cloud && supabase && entry.table === "sales" && entry.action === "insert") {
        const { items, ...saleRow } = payload;
        const { error } = await supabase.from("sales").upsert({
          ...saleRow,
          status: "synced",
          sync_pending: false,
          items: undefined,
        });
        if (error) throw error;
        if (items?.length) {
          const { error: itemErr } = await supabase.from("sale_items").upsert(items);
          if (itemErr) throw itemErr;
        }
      }
      const tx = store.transaction(["pending_sync", "sales", "remote_sales"], "readwrite");
      const current = await tx.objectStore("sales").get(payload.id);
      if (current) {
        await tx.objectStore("sales").put({
          ...current,
          status: "synced",
          sync_pending: false,
          updated_at: isoNow(),
        });
      }
      await tx.objectStore("remote_sales").put({
        ...payload,
        status: "synced",
        sync_pending: false,
      });
      await tx.objectStore("pending_sync").delete(entry.id);
      await tx.done;
      synced++;
    } catch (e) {
      /* sync item skipped */
    }
    onProgress?.({ done: i + 1, total: queue.length });
  }
  return { synced, online: true, cloud };
}

export type StockStatus = "critical" | "low" | "ok" | "out";
export interface InventoryRow {
  product: Product;
  status: StockStatus;
  days_to_expiry?: number;
}

export function stockStatusOf(p: Product): StockStatus {
  const min = p.min_stock ?? 5;
  if (p.stock <= 0) return "out";
  if (p.stock <= min) return "critical";
  if (p.stock <= min * 1.5) return "low";
  return "ok";
}

export function stockStatus(stock: number, min_stock = 5): StockStatus {
  if (stock <= 0) return "out";
  if (stock <= min_stock) return "critical";
  if (stock <= min_stock * 1.5) return "low";
  return "ok";
}

export async function getInventoryStatus(): Promise<InventoryRow[]> {
  const products = await db.getProducts();
  return products
    .map((p): InventoryRow => {
      const days_to_expiry = p.expires_at
        ? Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000)
        : undefined;
      return { product: p, status: stockStatusOf(p), days_to_expiry };
    })
    .sort((a, b) => a.product.stock - b.product.stock || a.product.name.localeCompare(b.product.name));
}

export async function getMetrics(): Promise<MetricsSummary> {
  const store = await getDB();
  const sales = await store.getAllFromIndex("sales", "store_id", STORE_ID);
  const countable = sales.filter((s) => s.status === "synced" || s.status === "pending_sync");
  const total_revenue = money(countable.reduce((a, s) => a + s.total, 0));
  const total_sales = countable.length;
  const avg_ticket = total_sales ? money(total_revenue / total_sales) : 0;

  const inv = await getInventoryStatus();
  const stock_critical = inv.filter((r) => r.status === "critical").length;
  const stock_low = inv.filter((r) => r.status === "low").length;

  const topMap = new Map<string, { name: string; sold: number; revenue: number }>();
  let profit = 0;
  for (const s of countable) {
    const items = await store.getAllFromIndex("sale_items", "sale_id", s.id);
    profit += s.profit ?? items.reduce((a, it) => a + (it.line_profit ?? 0), 0);
    for (const it of items) {
      const cur = topMap.get(it.product_id) ?? { name: it.product_name, sold: 0, revenue: 0 };
      cur.sold += it.quantity;
      cur.revenue += it.total_price;
      topMap.set(it.product_id, cur);
    }
  }

  const dailyMap = new Map<string, { revenue: number; sales: number; profit: number }>();
  const fmtDay = (d: Date) => d.toISOString().slice(0, 10);
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap.set(fmtDay(d), { revenue: 0, sales: 0, profit: 0 });
  }
  for (const s of countable) {
    const day = s.created_at.slice(0, 10);
    const cur = dailyMap.get(day);
    if (!cur) continue;
    cur.revenue += s.total;
    cur.sales += 1;
    cur.profit += s.profit ?? 0;
  }

  return {
    total_revenue,
    total_sales,
    avg_ticket,
    profit: money(profit),
    stock_critical,
    stock_low,
    pending_sync: await store.count("pending_sync"),
    critical_products: inv
      .filter((r) => r.status === "critical" || r.status === "out")
      .slice(0, 8)
      .map((r) => ({
        name: r.product.name,
        stock: r.product.stock,
        min_stock: r.product.min_stock ?? 5,
      })),
    top_products: Array.from(topMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    daily_series: Array.from(dailyMap.entries()).map(([date, v]) => ({
      date,
      revenue: money(v.revenue),
      sales: v.sales,
      profit: money(v.profit),
    })),
  };
}
