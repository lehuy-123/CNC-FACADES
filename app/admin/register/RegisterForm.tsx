"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitRegisterRequest, type AccessRequestFormState } from "@/actions/access-request.action";
import { ADMIN_EMAIL } from "@/lib/site";

const initialState: AccessRequestFormState = { status: "idle" };

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/25";

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState(submitRegisterRequest, initialState);

  if (state.status === "success") {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl font-bold text-white">
          ✓
        </div>
        <h2 className="mt-3 text-lg font-bold text-emerald-900">Yêu cầu đã được gửi</h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-800">{state.message}</p>
        <div className="mt-4 rounded-lg bg-white/70 p-3 text-xs text-slate-600">
          Email Admin nhận thông báo:{" "}
          <span className="font-bold text-blue-700">{ADMIN_EMAIL}</span>
        </div>
        <Link
          href="/admin/login"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Quay lại trang Đăng nhập
        </Link>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        ℹ️ <strong>Quy trình bảo mật:</strong> Tài khoản không tự kích hoạt. Yêu cầu của bạn sẽ được gửi tới Email Admin (
        <span className="font-bold">{ADMIN_EMAIL}</span>) để xét duyệt và cấp quyền.
      </div>

      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-700">
          Họ và tên
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          placeholder="VD: Trần Văn B"
          className={inputClass}
        />
        {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
          Số điện thoại liên hệ
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="Nhập số điện thoại"
          className={inputClass}
        />
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-700">
          Tên đăng nhập mong muốn
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          placeholder="Nhập tên đăng nhập bất kỳ"
          className={inputClass}
        />
        {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-md shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Đang gửi yêu cầu..." : "Gửi yêu cầu cấp tài khoản"}
      </button>

      <div className="pt-2 text-center">
        <Link href="/admin/login" className="text-xs text-slate-500 hover:text-blue-600 hover:underline">
          ← Đã có tài khoản? Đăng nhập ngay
        </Link>
      </div>
    </form>
  );
}
