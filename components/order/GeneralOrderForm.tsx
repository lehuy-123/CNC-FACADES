"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitOrder, type OrderFormState } from "@/actions/order.action";

const initialState: OrderFormState = { status: "idle" };

export default function GeneralOrderForm() {
  const [state, formAction, pending] = useActionState(submitOrder, initialState);
  const [cadName, setCadName] = useState("");
  const [imageName, setImageName] = useState("");
  const [copied, setCopied] = useState(false);

  return (
    <form action={formAction} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <span className="inline-block rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold">
          Yêu cầu tự do (Custom Request)
        </span>
        <h3 className="mt-2 text-xl font-extrabold text-slate-900">
          Gửi yêu cầu theo bản vẽ hoặc ý tưởng của bạn
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Nếu bạn không gia công theo các mẫu có sẵn phía trên, hãy gửi mô tả hoặc tải file AutoCAD/ảnh mẫu để xưởng bóc tách &amp; báo giá.
        </p>
      </div>

      {/* Thông báo thành công */}
      {state.status === "success" && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900 space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white text-xl font-bold">
              ✓
            </span>
            <div>
              <h4 className="text-base font-bold text-emerald-950">Gửi yêu cầu thành công!</h4>
              <p className="text-xs text-emerald-800">
                Xưởng CNC đã nhận được thông tin và sẽ liên hệ tư vấn báo giá cho bạn sớm nhất.
              </p>
            </div>
          </div>

          {state.orderCode && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 border border-emerald-200">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Mã tra cứu đơn:</span>
                <div className="font-mono text-xl font-black text-blue-700 tracking-wider">
                  {state.orderCode}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(state.orderCode || "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  {copied ? "✓ Đã copy" : "Copy mã"}
                </button>
                <Link
                  href={`/tra-cuu?q=${state.orderCode}`}
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Tra cứu ngay →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Thông báo lỗi */}
      {state.status === "error" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          {state.message || "Vui lòng kiểm tra lại thông tin gửi đơn."}
        </div>
      )}

      {/* Thông tin liên hệ */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="customerName" className="block text-xs font-bold text-slate-700">
            Họ và tên của bạn <span className="text-rose-500">*</span>
          </label>
          <input
            id="customerName"
            name="customerName"
            type="text"
            required
            defaultValue={state.values?.customerName}
            placeholder="Nguyễn Văn A"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          {state.fieldErrors?.customerName && (
            <p className="text-xs text-rose-600">{state.fieldErrors.customerName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="block text-xs font-bold text-slate-700">
            Số điện thoại liên hệ <span className="text-rose-500">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={state.values?.phone}
            placeholder="0901 234 567"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          {state.fieldErrors?.phone && (
            <p className="text-xs text-rose-600">{state.fieldErrors.phone}</p>
          )}
        </div>
      </div>

      {/* Mô tả yêu cầu */}
      <div className="space-y-1.5">
        <label htmlFor="requirements" className="block text-xs font-bold text-slate-700">
          Mô tả chi tiết yêu cầu gia công (Kích thước, số lượng, vật liệu...) <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="requirements"
          name="requirements"
          rows={4}
          required
          defaultValue={state.values?.requirements}
          placeholder="Ví dụ: Cần gia công 10 tấm pát thép dày 5mm, kích thước 300x150mm, khoét 4 lỗ bulong phi 12mm..."
          className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
        {state.fieldErrors?.requirements && (
          <p className="text-xs text-rose-600">{state.fieldErrors.requirements}</p>
        )}
      </div>

      {/* Tải file */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="cadFile"
            className="flex h-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-6 text-center transition hover:border-blue-500 hover:bg-blue-50"
          >
            <span className="text-sm font-bold text-blue-700">Tải lên file AutoCAD (.dwg/.dxf)</span>
            <span className="mt-1 text-xs text-slate-500">
              {cadName || "Nhấn để chọn file bản vẽ (tối đa 10MB)"}
            </span>
          </label>
          <input
            id="cadFile"
            name="cadFile"
            type="file"
            accept=".dwg,.dxf"
            className="sr-only"
            onChange={(e) => setCadName(e.target.files?.[0]?.name ?? "")}
          />
        </div>

        <div>
          <label
            htmlFor="imageFile"
            className="flex h-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-6 text-center transition hover:border-blue-500 hover:bg-blue-50"
          >
            <span className="text-sm font-bold text-blue-700">Tải lên hình ảnh mẫu</span>
            <span className="mt-1 text-xs text-slate-500">
              {imageName || "Ảnh chụp bản phác thảo hoặc mẫu (PNG, JPG)"}
            </span>
          </label>
          <input
            id="imageFile"
            name="imageFile"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setImageName(e.target.files?.[0]?.name ?? "")}
          />
        </div>
      </div>

      {/* Honeypot */}
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Đang gửi yêu cầu..." : "Gửi yêu cầu báo giá cho xưởng"}
      </button>
    </form>
  );
}
