import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  generateSecurePassword,
  passwordMeetsPolicy,
  PASSWORD_MAX_LEN,
  PASSWORD_MIN_LEN,
} from "./generate-password.ts";

const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^A-Za-z0-9]/;

test("generated password is 16-24 chars and includes every required set", () => {
  for (let i = 0; i < 80; i++) {
    const pw = generateSecurePassword();
    assert.ok(pw.length >= PASSWORD_MIN_LEN && pw.length <= PASSWORD_MAX_LEN, `len=${pw.length}`);
    assert.ok(UPPER.test(pw), `missing upper: ${pw}`);
    assert.ok(LOWER.test(pw), `missing lower: ${pw}`);
    assert.ok(DIGIT.test(pw), `missing digit: ${pw}`);
    assert.ok(SYMBOL.test(pw), `missing symbol: ${pw}`);
    assert.equal(passwordMeetsPolicy(pw), true);
  }
});

test("successive generations are not identical", () => {
  const a = generateSecurePassword();
  const b = generateSecurePassword();
  const c = generateSecurePassword();
  assert.ok(a !== b || b !== c);
});

test("passwordMeetsPolicy rejects short, long, and incomplete sets", () => {
  assert.equal(passwordMeetsPolicy("Aa1!short"), false);
  assert.equal(passwordMeetsPolicy("A".repeat(25) + "a1!"), false);
  assert.equal(passwordMeetsPolicy("aaaaaaaaaaaaaaaa"), false);
  assert.equal(passwordMeetsPolicy("AAAAAAAAAAAAAAA1"), false);
  assert.equal(passwordMeetsPolicy("AAAAAAAAAAAAAAAa"), false);
  assert.equal(passwordMeetsPolicy("AAAAAAAAAAAAAAAa1"), false);
});

test("generator source does not use Math.random", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "generate-password.ts"), "utf8");
  assert.equal(src.includes("Math.random("), false);
});
