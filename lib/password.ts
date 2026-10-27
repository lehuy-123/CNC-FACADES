import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Băm mật khẩu bằng scrypt, định dạng "salt:hash" (hex). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Bỏ các ký tự dễ nhầm (0/O, 1/l/I) để admin đọc qua điện thoại không bị sai
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 10) {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Mã tra cứu đơn, ví dụ CNC-7K2P9X */
export function generateOrderCode() {
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `CNC-${out}`;
}
