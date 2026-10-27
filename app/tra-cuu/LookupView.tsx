"use client";

import { useState, useTransition } from "react";
import { lookupOrders, type OrderLookupItem } from "@/actions/order.action";
import { STATUS_LABELS, STATUS_STYLES, formatDateTime } from "@/lib/orders";

export default function LookupView({
  initialQuery = "",
  initialOrders = null,
  initialError = null,
}: {
  initialQuery?: string;
  initialOrders?: OrderLookupItem[] | null;
  initialError?: string | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = useState<OrderLookupItem[] | null>(initialOrders);
  const [error, setError] = useState<string | null>(initialError);

  const handleSearch = (searchVal: string) => {
    if (!searchVal.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await lookupOrders(searchVal);
      if (res.success && res.data) {
        setOrders(res.data);
      } else {
        setError(res.message || "Không tìm thấy đơn hàng nào.");
        setOrders([]);
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Search box */}
      <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-md sm:p-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập Số điện thoại hoặc Mã đơn hàng (VD: CNC-ABC123)..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Đang tìm..." : "Tra cứu lịch sử"}
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          * Khách hàng không cần đăng nhập tài khoản. Hệ thống tự động đồng bộ tất cả yêu cầu theo số điện thoại của bạn.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Orders list */}
      {orders !== null && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-[#0f2a5c]">
              Kết quả tra cứu ({orders.length} yêu cầu)
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-slate-500">Chưa tìm thấy đơn hàng nào với thông tin trên.</p>
              <p className="mt-1 text-xs text-slate-400">
                Vui lòng kiểm tra lại số điện thoại hoặc mã đơn hàng đã nhập.
              </p>
            </div>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-blue-700">
                        {o.code || "CNC-YEUCAU"}
                      </span>
                      <span className="text-xs text-slate-400">• {formatDateTime(new Date(o.createdAt))}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      Khách hàng: <span className="font-semibold">{o.customerName}</span> ({o.phone})
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-xs font-medium uppercase text-slate-400">Nội dung yêu cầu gia công</span>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                    {o.requirements}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex flex-wrap gap-2">
                    {o.hasCadFile && <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">✓ Có file AutoCAD</span>}
                    {o.hasImageFile && <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">✓ Có ảnh mẫu</span>}
                    {o.hasAiSketch && (
                      <span className="rounded bg-purple-50 px-2 py-1 font-semibold text-purple-700">
                        ✨ Có bản phác thảo AI
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500">
                    Trạng thái: <span className="font-semibold text-slate-800">{STATUS_LABELS[o.status]}</span>
                  </div>
                </div>

                {o.aiSketchUrl && (
                  <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50/40 p-3">
                    <span className="text-xs font-bold text-purple-800">Bản vẽ phác thảo AI bạn đã duyệt:</span>
                    <a href={o.aiSketchUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={o.aiSketchUrl}
                        alt="Bản vẽ phác thảo AI"
                        className="max-h-56 rounded-lg border border-purple-200 bg-white object-contain"
                      />
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
