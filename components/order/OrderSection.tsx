import Link from "next/link";
import { getSampleProducts } from "@/lib/data/products";
import GeneralOrderForm from "./GeneralOrderForm";
import { formatVND } from "@/lib/format";

export default async function OrderSection() {
  const products = await getSampleProducts();

  return (
    <section id="order" className="py-20 bg-slate-50/70 border-t border-slate-200 scroll-mt-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
        {/* Header tiêu đề */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700">
            Quy trình Đặt hàng Chuẩn hóa
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold uppercase text-[#0f2a5c]">
            Đặt hàng gia công cơ khí CNC
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Chọn 1 trong các mẫu thiết kế bên dưới để vào trang <strong>Tùy biến tham số CAD</strong> riêng biệt, hoặc gửi yêu cầu gia công tự do cho xưởng.
          </p>
        </div>

        {/* 1. LỰA CHỌN THEO KHUÔN MẪU PARAMETRIC CÓ SẴN */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>📐</span>
                <span>Cách 1: Tùy biến tham số theo mẫu có sẵn (Khuyên dùng)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click vào từng mẫu bên dưới để mở trang chi tiết và bảng tính tham số CAD riêng biệt của mẫu đó.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}#parametric-order`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-400 hover:shadow-lg transition duration-200"
              >
                <div className="flex items-center gap-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-16 w-16 rounded-xl object-cover border border-slate-100 group-hover:scale-105 transition shrink-0"
                  />
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.category}</p>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition truncate">
                      {p.name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {p.dimensions ? `Gốc: ${p.dimensions}` : p.material || "Chuẩn xưởng"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-blue-700">
                    {p.price ? formatVND(p.price) : "Liên hệ báo giá"}
                  </span>
                  <span className="font-bold text-blue-600 group-hover:translate-x-1 transition flex items-center gap-1">
                    <span>Tùy biến CAD</span>
                    <span>→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2. FORM YÊU CẦU GIA CÔNG TỰ DO */}
        <div className="space-y-4 pt-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>📋</span>
              <span>Cách 2: Gửi yêu cầu gia công tự do (Bản vẽ riêng / File DWG / DXF)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Dành cho khách hàng đã có sẵn file thiết kế AutoCAD hoặc yêu cầu kết cấu đặc thù ngoài danh mục mẫu.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <GeneralOrderForm />
          </div>
        </div>
      </div>
    </section>
  );
}
