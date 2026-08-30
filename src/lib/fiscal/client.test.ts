import assert from "node:assert/strict";
import test from "node:test";
import { mapFiscalHttpToReceipt, POS_FISCAL_MODEL } from "./client.ts";

test("POS uses NFC-e model 65 without RTC payload keys", () => {
  assert.equal(POS_FISCAL_MODEL, "65");
});

test("mapFiscalHttpToReceipt never marks authorization", () => {
  const ok = mapFiscalHttpToReceipt(200, { ok: true, authorized: false });
  const bad = mapFiscalHttpToReceipt(400, { ok: false, error: "SVC não se aplica" });
  assert.equal(ok.authorized, false);
  assert.equal(ok.kind, "validated");
  assert.equal(bad.authorized, false);
  assert.equal(bad.kind, "rejected");
});

test("mapFiscalHttpToReceipt maps session and provider availability", () => {
  const a = mapFiscalHttpToReceipt(401, { error: "Não autorizado." });
  const b = mapFiscalHttpToReceipt(503, { ok: false, error: "Emissão fiscal indisponível no momento." });
  assert.equal(a.kind, "unauthorized");
  assert.equal(b.kind, "unavailable");
});
