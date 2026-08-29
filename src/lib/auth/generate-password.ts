/**
 * CSPRNG password generation. Uses Web Crypto (Node + browser).
 * Entropy from Web Crypto only.
 */

export const PASSWORD_MIN_LEN = 16;
export const PASSWORD_MAX_LEN = 24;

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGIT = "0123456789";
const SYMBOL = "!@#$%^&*_+-=?";
const ALL = UPPER + LOWER + DIGIT + SYMBOL;

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error("maxExclusive must be > 0");
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Error("CSPRNG unavailable");
  }
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  let x = 0;
  do {
    cryptoObj.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= limit);
  return x % maxExclusive;
}

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)]!;
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }
  return chars;
}

export function generateSecurePassword(): string {
  const extra = randomInt(PASSWORD_MAX_LEN - PASSWORD_MIN_LEN + 1);
  const length = PASSWORD_MIN_LEN + extra;
  const chars: string[] = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];
  while (chars.length < length) chars.push(pick(ALL));
  return shuffle(chars).join("");
}

export function passwordMeetsPolicy(password: string): boolean {
  if (password.length < PASSWORD_MIN_LEN || password.length > PASSWORD_MAX_LEN) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}
