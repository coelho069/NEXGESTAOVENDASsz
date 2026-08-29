"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  db,
  getPendingCount,
  syncPending,
  getMetrics,
  getInventoryStatus,
  type InventoryRow,
  type SyncProgress,
} from "@/lib/db";
import { parseNfeXml } from "@/lib/nfe";
import type { CashShift, Customer, MetricsSummary, Product, Sale, Store } from "@/types";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface StoreState {
  realOnline: boolean;
  offlineMode: boolean;
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  lastSync: { synced: number; online: boolean } | null;
  ready: boolean;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  metrics: MetricsSummary | null;
  inventory: InventoryRow[];
  cart: CartItem[];
  store: Store | null;
  catalogEnabled: boolean;
  shift: CashShift | null;
  shifts: CashShift[];
}

interface StoreActions {
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  finalizeSale: (
    paymentMethod: "cash" | "card" | "pix" | "credit",
    customerName?: string
  ) => Promise<Sale>;
  setOfflineMode: (on: boolean) => void;
  runSync: () => Promise<{ synced: number; online: boolean }>;
  refresh: () => Promise<void>;
  setCatalogEnabled: (on: boolean) => Promise<void>;
  setProductCatalogVisible: (id: string, visible: boolean) => Promise<void>;
  importXml: (xml?: string) => Promise<{ products: number; units: number; created?: number }>;
  importXmlFile: (file: File) => Promise<{ products: number; units: number; created?: number }>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  createProduct: (input: Partial<Product> & { name: string; price: number }) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  openShift: (openingCash: number) => Promise<CashShift>;
  closeShift: (closingCash: number, notes?: string) => Promise<CashShift>;
}

const StoreContext = createContext<{ state: StoreState; actions: StoreActions } | undefined>(
  undefined
);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

async function loadData() {
  if (!(await db.isSeeded())) await db.seed();
  const [products, sales, customers, metrics, inventory, pendingCount, store, shift, shifts] =
    await Promise.all([
      db.getProducts(),
      db.getSales(),
      db.getCustomers(),
      getMetrics(),
      getInventoryStatus(),
      getPendingCount(),
      db.getStore(),
      db.getOpenShift(),
      db.getShifts(),
    ]);
  return { products, sales, customers, metrics, inventory, pendingCount, store, shift, shifts };
}

const OFFLINE_KEY = "fg-offline-mode";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    realOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    offlineMode: false,
    isOnline: true,
    pendingCount: 0,
    isSyncing: false,
    syncProgress: null,
    lastSync: null,
    ready: false,
    products: [],
    sales: [],
    customers: [],
    metrics: null,
    inventory: [],
    cart: [],
    store: null,
    catalogEnabled: true,
    shift: null,
    shifts: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    const data = await loadData();
    setState((s) => ({
      ...s,
      products: data.products,
      sales: data.sales,
      customers: data.customers,
      metrics: data.metrics,
      inventory: data.inventory,
      pendingCount: data.pendingCount,
      store: data.store,
      catalogEnabled: data.store.catalog_enabled,
      shift: data.shift,
      shifts: data.shifts,
      ready: true,
    }));
  }, []);

  const runSync = useCallback(async () => {
    const current = stateRef.current;
    if (!current.isOnline || syncingRef.current) return { synced: 0, online: false };
    syncingRef.current = true;
    setState((s) => ({
      ...s,
      isSyncing: true,
      syncProgress: { done: 0, total: Math.max(1, s.pendingCount) },
    }));
    try {
      const res = await syncPending((p) => setState((s) => ({ ...s, syncProgress: p })));
      await refresh();
      setState((s) => ({ ...s, lastSync: res, isSyncing: false, syncProgress: null }));
      return res;
    } catch (e) {
      setState((s) => ({ ...s, isSyncing: false, syncProgress: null }));
      throw e;
    } finally {
      syncingRef.current = false;
    }
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadData();
      if (cancelled) return;
      const savedOffline =
        typeof window !== "undefined" && sessionStorage.getItem(OFFLINE_KEY) === "1";
      const realOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      setState((s) => ({
        ...s,
        ...data,
        catalogEnabled: data.store.catalog_enabled,
        offlineMode: savedOffline,
        realOnline,
        isOnline: realOnline && !savedOffline,
        ready: true,
      }));
    })();
    const onOnline = () => {
      setState((s) => ({ ...s, realOnline: true, isOnline: !s.offlineMode }));
    };
    const onOffline = () => setState((s) => ({ ...s, realOnline: false, isOnline: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!state.ready || !state.isOnline || state.pendingCount === 0) return;
    const t = setTimeout(() => void runSync(), 400);
    return () => clearTimeout(t);
  }, [state.isOnline, state.ready, state.pendingCount, runSync]);

  const clearCart = useCallback(() => setState((s) => ({ ...s, cart: [] })), []);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (product.stock <= 0) return;
    setState((s) => {
      const existing = s.cart.find((c) => c.product.id === product.id);
      if (existing) {
        return {
          ...s,
          cart: s.cart.map((c) =>
            c.product.id === product.id
              ? { ...c, quantity: Math.min(c.quantity + quantity, product.stock) }
              : c
          ),
        };
      }
      return {
        ...s,
        cart: [...s.cart, { product, quantity: Math.min(quantity, product.stock) }],
      };
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setState((s) => ({
      ...s,
      cart:
        quantity <= 0
          ? s.cart.filter((c) => c.product.id !== productId)
          : s.cart.map((c) =>
              c.product.id === productId
                ? { ...c, quantity: Math.max(1, Math.min(quantity, c.product.stock)) }
                : c
            ),
    }));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setState((s) => ({ ...s, cart: s.cart.filter((c) => c.product.id !== productId) }));
  }, []);

  const finalizeSale = useCallback(
    async (
      paymentMethod: "cash" | "card" | "pix" | "credit",
      customerName?: string
    ): Promise<Sale> => {
      const current = stateRef.current;
      if (current.cart.length === 0) throw new Error("Carrinho vazio");
      const onlineNow = current.isOnline;
      setState((s) => ({ ...s, isSyncing: true, syncProgress: { done: 0, total: 1 } }));
      try {
        const sale = await db.createSale({
          customer_name: customerName,
          customer_id: null,
          items: current.cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
          payment_method: paymentMethod,
          online: onlineNow,
        });
        clearCart();
        if (onlineNow) {
          const res = await syncPending((p) => setState((s) => ({ ...s, syncProgress: p })));
          setState((s) => ({ ...s, lastSync: res }));
        }
        await refresh();
        setState((s) => ({ ...s, isSyncing: false, syncProgress: null }));
        return sale;
      } catch (e) {
        setState((s) => ({ ...s, isSyncing: false, syncProgress: null }));
        throw e;
      }
    },
    [clearCart, refresh]
  );

  const setOfflineMode = useCallback((on: boolean) => {
    sessionStorage.setItem(OFFLINE_KEY, on ? "1" : "0");
    setState((s) => ({ ...s, offlineMode: on, isOnline: !on && s.realOnline }));
  }, []);

  const setCatalogEnabled = useCallback(async (on: boolean) => {
    const store = await db.setCatalogEnabled(on);
    setState((s) => ({ ...s, store, catalogEnabled: store.catalog_enabled }));
  }, []);

  const setProductCatalogVisible = useCallback(
    async (id: string, visible: boolean) => {
      await db.updateProduct(id, { catalog_visible: visible });
      await refresh();
    },
    [refresh]
  );

  const importXml = useCallback(
    async (xml?: string) => {
      const result = await db.importXml(xml);
      await refresh();
      return result;
    },
    [refresh]
  );

  const importXmlFile = useCallback(
    async (file: File) => {
      const xml = await file.text();
      parseNfeXml(xml);
      const result = await db.importXml(xml);
      await refresh();
      return result;
    },
    [refresh]
  );

  const updateProduct = useCallback(
    async (id: string, patch: Partial<Product>) => {
      await db.updateProduct(id, patch);
      await refresh();
    },
    [refresh]
  );

  const createProduct = useCallback(
    async (input: Partial<Product> & { name: string; price: number }) => {
      const p = await db.createProduct(input);
      await refresh();
      return p;
    },
    [refresh]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await db.deleteProduct(id);
      await refresh();
    },
    [refresh]
  );

  const openShift = useCallback(
    async (openingCash: number) => {
      const shift = await db.openShift(openingCash);
      await refresh();
      return shift;
    },
    [refresh]
  );

  const closeShift = useCallback(
    async (closingCash: number, notes?: string) => {
      const shift = await db.closeShift(closingCash, notes);
      await refresh();
      return shift;
    },
    [refresh]
  );

  const value = {
    state,
    actions: {
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      finalizeSale,
      setOfflineMode,
      runSync,
      refresh,
      setCatalogEnabled,
      setProductCatalogVisible,
      importXml,
      importXmlFile,
      updateProduct,
      createProduct,
      deleteProduct,
      openShift,
      closeShift,
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export type { StoreState, StoreActions };
