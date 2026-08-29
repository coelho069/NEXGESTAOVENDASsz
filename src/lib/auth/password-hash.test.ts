import assert from "node:assert/strict";
import test from "node:test";
import { generateSecurePassword } from "./generate-password.ts";
import { hashPassword, verifyPassword } from "./password-hash.ts";

test("hashPassword is not the plaintext and verifies", async () => {
  const plain = generateSecurePassword();
  const hash = await hashPassword(plain);
  assert.notEqual(hash, plain);
  assert.match(hash, /^\$2[aby]?\$/);
  assert.equal(await verifyPassword(plain, hash), true);
  assert.equal(await verifyPassword(plain + "x", hash), false);
});
