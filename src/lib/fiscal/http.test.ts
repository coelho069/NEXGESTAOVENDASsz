import assert from "node:assert/strict";
import test from "node:test";
import type { SessionUser } from "../auth/types.ts";
import type { Sale } from "../../types/index.ts";
import { executeFiscalEmit, parseFiscalEmitRequest } from "./http.ts";
import {
  processFiscalEmit,
  validateContingencyStub,
  validateRequiredFields,
  type FiscalProvider,
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

function provider(configured = true): FiscalProvider {
  const issuer = creds();
  if (!configured) {
    issuer.token = "";
    issuer.cnpj = "";
  }
  return {
    configured: () => configured,
    credentials: () => issuer,
    validateRequired: (input) => validateRequiredFields(input, issuer),
    validateContingency: (input) => validateContingencyStub(input, issuer),
    process: (input) => processFiscalEmit(input, issuer),
  };
}

const user: SessionUser = {
  sub: "user-1",
  email: "user@example.com",
  name: "Vendedor",
  role: "user",
  exp: Date.now() + 60_000,
  subExpiresAt: null,
};

test("parseFiscalEmitRequest accepts NFC-e body with default store-1", () => {
  const parsed = parseFiscalEmitRequest({
    model: "65",
    sale: sale(),
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.input.storeId, "store-1");
    assert.equal(parsed.input.contingency, "none");
    assert.equal(parsed.input.model, "65");
  }
});

test("parseFiscalEmitRequest rejects unknown model and missing sale", () => {
  const parsed = parseFiscalEmitRequest({ model: "99" });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.ok(parsed.issues.some((i) => i.field === "model"));
    assert.ok(parsed.issues.some((i) => i.field === "sale"));
  }
});

test("executeFiscalEmit returns 401 without session", () => {
  const r = executeFiscalEmit(null, { model: "65", sale: sale() }, provider());
  assert.equal(r.status, 401);
  assert.deepEqual(r.body, { error: "Não autorizado." });
});

test("executeFiscalEmit returns 503 when legacy provider is not configured", () => {
  const r = executeFiscalEmit(user, { model: "65", sale: sale() }, provider(false));
  assert.equal(r.status, 503);
  assert.equal("ok" in r.body && r.body.ok, false);
});

test("executeFiscalEmit returns 400 on 55/65 contingency rule from provider", () => {
  const r = executeFiscalEmit(
    user,
    { model: "65", contingency: "svc", sale: sale() },
    provider()
  );
  assert.equal(r.status, 400);
  if ("issues" in r.body) {
    assert.ok((r.body.issues ?? []).some((i) => i.field === "contingency"));
  }
});

test("executeFiscalEmit returns 200 stub without authorization or network", () => {
  const r = executeFiscalEmit(user, { model: "65", sale: sale() }, provider());
  assert.equal(r.status, 200);
  assert.equal("ok" in r.body && r.body.ok, true);
  if ("authorized" in r.body) {
    assert.equal(r.body.authorized, false);
    assert.equal(r.body.externalCall, false);
  }
});
