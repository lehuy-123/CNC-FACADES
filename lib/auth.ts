import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 giờ

// Hash giả để thời gian phản hồi không lộ việc tài khoản có tồn tại hay không
const DUMMY_HASH =
  "00000000000000000000000000000000:" + "0".repeat(128);

export type SessionRole = "admin" | "staff";
export type Session = { role: SessionRole; sub?: string };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET chưa được cấu hình trong .env");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function hmac(v: string) {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}

/**
 * Kiểm tra đăng nhập.
 * - Admin chính: ADMIN_USERNAME / ADMIN_PASSWORD trong .env
 * - Nhân viên: tài khoản trong DB đã được admin duyệt và đang hoạt động
 */
export async function authenticate(username: string, password: string): Promise<Session | null> {
  const envUser = process.env.ADMIN_USERNAME;
  const envPass = process.env.ADMIN_PASSWORD;
  if (envUser && envPass && safeEqual(hmac(username), hmac(envUser)) && safeEqual(hmac(password), hmac(envPass))) {
    return { role: "admin" };
  }

  const account = await prisma.adminAccount.findUnique({ where: { username: username.trim().toLowerCase() } });
  const ok = await verifyPassword(password, account?.passwordHash ?? DUMMY_HASH);
  if (account && account.active && ok) return { role: "staff", sub: account.id };
  return null;
}

export async function createSession(session: Session) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ ...session, exp })).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  (await cookies()).set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

/** Đọc session từ cookie. Với nhân viên, kiểm tra thêm tài khoản còn hoạt động (admin có thể khóa bất cứ lúc nào). */
export async function getSession(): Promise<Session | null> {
  await connection();
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  let data: { role?: string; sub?: string; exp?: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof data.exp !== "number" || data.exp <= Date.now() / 1000) return null;

  if (data.role === "admin") return { role: "admin" };
  if (data.role === "staff" && data.sub) {
    const account = await prisma.adminAccount.findUnique({
      where: { id: data.sub },
      select: { active: true },
    });
    return account?.active ? { role: "staff", sub: data.sub } : null;
  }
  return null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getSession()) !== null;
}

/** Gọi ở mọi trang / action của dashboard: chưa đăng nhập thì chuyển về trang login. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Chỉ admin chính (không phải nhân viên) mới được duyệt tài khoản. */
export async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (session.role !== "admin") redirect("/admin");
  return session;
}
