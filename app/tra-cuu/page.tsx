import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LookupView from "./LookupView";
import { lookupOrders } from "@/actions/order.action";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tra cứu đơn hàng & Tiến độ gia công | CNC & AI Workshop",
  description: "Tra cứu tiến độ bản vẽ và đơn hàng gia công CNC bằng Số điện thoại hoặc Mã đơn hàng.",
};

export default function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />

      <main className="py-12 px-4 sm:px-6">
        <div className="mx-auto mb-8 max-w-4xl text-center">
          <span className="inline-block rounded-full border border-blue-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
            Dành cho khách hàng
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-[#0f2a5c] sm:text-4xl">
            Tra cứu lịch sử &amp; tiến độ đơn hàng
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Không cần tài khoản! Nhập số điện thoại của bạn hoặc mã đơn hàng để xem chi tiết yêu cầu và báo giá.
          </p>
        </div>

        <Suspense fallback={<div className="mx-auto max-w-3xl text-center py-12 text-slate-400">Đang tải kết quả tra cứu...</div>}>
          <LookupContent searchParams={searchParams} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

async function LookupContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const initialQuery = q ?? "";
  const initialResult = initialQuery ? await lookupOrders(initialQuery) : null;

  return (
    <LookupView
      initialQuery={initialQuery}
      initialOrders={initialResult?.success ? initialResult.data : null}
      initialError={initialResult && !initialResult.success ? initialResult.message : null}
    />
  );
}
