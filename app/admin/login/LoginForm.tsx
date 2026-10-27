"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/app/admin/actions";
import { ADMIN_EMAIL } from "@/lib/site";

const initialState: LoginState = {};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/25";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">
          Tên đăng nhập
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          placeholder="admin hoặc tên nhân viên"
          className={inputClass}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Mật khẩu
          </label>
          <Link
            href="/admin/forgot-password"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-md shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Đang đăng nhập..." : "Đăng nhập Dashboard"}
      </button>

      <div className="border-t border-slate-100 pt-4 text-center">
        <p className="text-xs text-slate-500">
          Chưa có quyền truy cập?{" "}
          <Link href="/admin/register" className="font-semibold text-blue-600 hover:underline">
            Đăng ký quyền vào Dashboard
          </Link>
        </p>
        <p className="mt-2 text-[11px] text-slate-400">
          Thông báo cấp quyền được gửi tới Email Admin:{" "}
          <span className="font-semibold text-slate-600">{ADMIN_EMAIL}</span>
        </p>
      </div>
    </form>
  );
}
