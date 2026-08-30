import assert from "node:assert/strict";
import test from "node:test";
import type { Sale } from "../../types/index.ts";
import {
  processFiscalEmit,
  validateContingencyStub,
  validateRequiredFields,
  type FiscalEmitInput,
} from "./provider.ts";

function sale(over: Partial<Sale> = {}): Sale {
  return {
    id: "sale-1",
    store_id: "store-1",
    total: 10,
    cost_total: 4,
    profit: 6,
    payment_method: "pix",
    status: "completed",
    sync_pending: false,
    items: [
      {
        id: "item-1",
        sale_id: "sale-1",
        product_id: "p-1",
        product_name: "Café",
        quantity: 1,
        unit_price: 10,
        unit_cost: 4,
        total_price: 10,
        line_profit: 6,
      },
    ],
    created_at: "2026-08-30T00:00:00.000Z",
    updated_at: "2026-08-30T00:00:00.000Z",
    ...over,
  };
}

function creds() {
  return {
    environment: "homologation" as const,
    uf: "RO",
    cnpj: "00000000000191",
    ie: "123",
    token: "tok",
    cscId: "1",
    cscToken: "csc",
  };
}

function input(over: Partial<FiscalEmitInput> = {}): FiscalEmitInput {
  return {
    sale: sale(),
    model: "65",
    storeId: "store-1",
    contingency: "none",
    ...over,
  };
}

test("validateRequiredFields rejects empty items and missing NFC-e CSC", () => {
  const empty = input({ sale: sale({ items: [] }) });
  const noCsc = creds();
  noCsc.cscToken = "";
  const a = validateRequiredFields(empty, creds());
  const b = validateRequiredFields(input(), noCsc);
  assert.equal(a.ok, false);
  assert.ok(a.issues.some((i) => i.field === "sale.items"));
  assert.equal(b.ok, false);
  assert.ok(b.issues.some((i) => i.field === "FISCAL_CSC_TOKEN"));
});

test("validateRequiredFields accepts NFC-e with issuer env stub", () => {
  const r = validateRequiredFields(input(), creds());
  assert.equal(r.ok, true);
  assert.equal(r.issues.length, 0);
});

test("validateContingencyStub never flags an external call", () => {
  const r = validateContingencyStub(input({ contingency: "offline" }), creds());
  assert.equal(r.externalCall, false);
  assert.equal(r.kind, "offline");
  assert.equal(r.ok, true);
});

test("validateContingencyStub rejects SVC on NFC-e and offline on NF-e", () => {
  const svc65 = validateContingencyStub(input({ contingency: "svc" }), creds());
  const off55 = validateContingencyStub(input({ model: "55", contingency: "offline" }), creds());
  assert.equal(svc65.ok, false);
  assert.equal(off55.ok, false);
  assert.equal(svc65.externalCall, false);
  assert.equal(off55.externalCall, false);
});

test("processFiscalEmit never authorizes and never calls network", () => {
  const r = processFiscalEmit(input(), creds());
  assert.equal(r.ok, true);
  assert.equal(r.status, "validated");
  assert.equal(r.authorized, false);
  assert.equal(r.externalCall, false);
});

test("processFiscalEmit marks not_configured when issuer token is missing", () => {
  const empty = creds();
  empty.token = "";
  empty.cnpj = "";
  const r = processFiscalEmit(input(), empty);
  assert.equal(r.ok, false);
  assert.equal(r.status, "not_configured");
  assert.equal(r.authorized, false);
});
