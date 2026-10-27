"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type ProductItem } from "@/lib/data/product-types";
import { formatVND } from "@/lib/format";

type Props = {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (product: ProductItem) => void;
};

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onSelectModel,
}: Props) {
  const [isZoomed, setIsZoomed] = useState(false);

  // Lắng nghe phím ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isZoomed, onClose]);

  if (!isOpen || !product) return null;

  const handleOrderClick = () => {
    onClose();
    onSelectModel(product);
  };

  return (
    <>
      {/* Zoom ảnh toàn màn hình nếu người dùng bấm xem ảnh lớn */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md transition-all cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-h-full max-w-5xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute -top-3 -right-3 rounded-full bg-white/20 hover:bg-white text-white hover:text-black p-2 transition cursor-pointer"
            >
              ✕
            </button>
            <p className="mt-3 text-center text-xs font-semibold text-slate-300">
              {product.name} — Bấm bất kỳ đâu để thu nhỏ
            </p>
          </div>
        </div>
      )}

      {/* Main Detail Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
        {/* Backdrop click to close */}
        <div
          className="fixed inset-0"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto overflow-hidden z-10">
          {/* Header thanh bar */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>Sản phẩm mẫu xưởng</span>
              <span>›</span>
              <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {product.category}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              title="Đóng (Esc)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body: 2 cột trên Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-12 max-h-[78vh] overflow-y-auto">
            {/* Cột trái: Hình ảnh sản phẩm & snapshot */}
            <div className="md:col-span-5 p-6 bg-slate-50/50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100">
              <div>
                {/* Ảnh chính */}
                <div
                  className="group relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm cursor-zoom-in"
                  onClick={() => setIsZoomed(true)}
                  title="Bấm để xem ảnh phóng to"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/800x600/0f2a5c/ffffff?text=CNC+Product";
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md">
                      🔍 Bấm phóng to ảnh
                    </span>
                  </div>
                </div>

                {/* Badges tiêu chuẩn cơ khí */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 rounded-xl bg-white p-2.5 border border-slate-200 text-xs text-slate-700 shadow-2xs">
                    <span className="text-base">⚙️</span>
                    <div>
                      <p className="font-bold text-slate-900">Công nghệ CNC chính xác</p>
                      <p className="text-[11px] text-slate-500">Cắt Laser Fiber &amp; Chấn bẻ chuẩn góc</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white p-2.5 border border-slate-200 text-xs text-slate-700 shadow-2xs">
                    <span className="text-base">📐</span>
                    <div>
                      <p className="font-bold text-slate-900">Dung sai kỹ thuật</p>
                      <p className="text-[11px] text-slate-500">Đạt chuẩn dung sai cơ khí ±0.03mm</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin hỗ trợ */}
              <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                <p className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span> Hỗ trợ gia công số lượng từ 1 chiếc
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span> Xuất bản vẽ CAD 2D/3D duyệt trước khi làm
                </p>
              </div>
            </div>

            {/* Cột phải: Thông số chi tiết & Thao tác */}
            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Tiêu đề & Giá */}
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {product.name}
                  </h3>
                  <div className="mt-3 flex flex-wrap items-baseline gap-3">
                    <span className="text-2xl font-black text-blue-700">
                      {product.price ? formatVND(product.price) : "Liên hệ báo giá"}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                      Giá gia công trực tiếp tại xưởng
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    * Giá tham khảo thành phẩm (đã bao gồm phôi vật liệu và công gia công). Đơn giá điều chỉnh linh hoạt theo số lượng thực tế.
                  </p>
                </div>

                {/* Bảng thông số kỹ thuật (Mechanical Specs) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Bảng quy cách &amp; Thông số kỹ thuật
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Kích thước */}
                    <div className="rounded-xl bg-white p-3 border border-slate-200">
                      <span className="block text-slate-400 font-medium text-[11px]">Kích thước / Quy cách:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {product.dimensions || "Tùy biến theo yêu cầu"}
                      </span>
                    </div>

                    {/* Vật liệu */}
                    <div className="rounded-xl bg-white p-3 border border-slate-200">
                      <span className="block text-slate-400 font-medium text-[11px]">Vật liệu gia công:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {product.material || "Thép SS400 / Inox 304 / Nhôm A5052"}
                      </span>
                    </div>

                    {/* Hoàn thiện bề mặt */}
                    <div className="rounded-xl bg-white p-3 border border-slate-200">
                      <span className="block text-slate-400 font-medium text-[11px]">Xử lý bề mặt:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        Sơn tĩnh điện / Anodize / Đánh xước
                      </span>
                    </div>

                    {/* Tiến độ hoàn thành */}
                    <div className="rounded-xl bg-white p-3 border border-slate-200">
                      <span className="block text-slate-400 font-medium text-[11px]">Thời gian gia công:</span>
                      <span className="font-bold text-emerald-700 text-sm">
                        1 - 3 ngày làm việc
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mô tả chi tiết & Ứng dụng thực tế */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Mô tả chi tiết &amp; Ứng dụng
                  </h4>
                  <div className="rounded-2xl bg-white p-4 border border-slate-200 text-sm text-slate-700 leading-relaxed space-y-2.5">
                    <p>
                      {product.description ||
                        "Sản phẩm được lập trình gia công trên trung tâm máy CNC và máy cắt laser công nghệ cao, đảm bảo đường cắt sắc sảo, mối hàn ngấu chắc và độ phẳng góc chuẩn xác."}
                    </p>
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      💡 <strong>Gợi ý tùy chỉnh:</strong> Bạn hoàn toàn có thể yêu cầu thay đổi độ dày kim loại tấm, điều chỉnh kích thước dài × rộng × cao hoặc đục thêm các lỗ bắt ốc, rãnh thoát khí theo mục đích sử dụng riêng.
                    </p>
                  </div>
                </div>
              </div>

              {/* Nút tác vụ (Action buttons) */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Đóng lại
                </button>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <Link
                    href={`/product/${product.id}/order`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 transition cursor-pointer"
                  >
                    <span>⚡ Tùy biến &amp; Đặt hàng theo mẫu</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
