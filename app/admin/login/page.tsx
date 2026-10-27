import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

// Đã đăng nhập thì vào thẳng dashboard. Đọc cookie nên phải nằm trong Suspense.
async function RedirectIfLoggedIn() {
  if (await isAdmin()) redirect("/admin");
  return null;
}

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(#dbe7f7 1px, transparent 1px), linear-gradient(90deg, #dbe7f7 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <div className="relative w-full max-w-md rounded-2xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-900/10">
        <p className="text-center text-xl font-extrabold tracking-tight text-[#0f2a5c]">
          CNC <span className="text-blue-600">&amp;</span> AI Workshop
        </p>
        <h1 className="mt-2 text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
          Đăng nhập quản trị
        </h1>
        <LoginForm />
        <Link href="/" className="mt-6 block text-center text-sm text-slate-500 hover:text-blue-600">
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}
