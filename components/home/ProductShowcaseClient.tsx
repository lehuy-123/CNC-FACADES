"use client";

import { useState } from "react";
import Link from "next/link";
import { type ProductItem } from "@/lib/data/product-types";
import { formatVND } from "@/lib/format";
import ProductDetailModal from "./ProductDetailModal";

type Props = {
  products: ProductItem[];
};

export default function ProductShowcaseClient({ products }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<ProductItem | null>(null);

  // Lấy danh sách các danh mục duy nhất từ sản phẩm thực tế
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  // Lọc sản phẩm theo danh mục và tìm kiếm
  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.dimensions && p.dimensions.toLowerCase().includes(q)) ||
      (p.material && p.material.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // Hành động: Chọn mẫu này để đặt hàng -> Tự động điền mô tả & cuộn xuống form
  const handleSelectModel = (product: ProductItem) => {
    const textToFill = `Gia công theo mẫu: ${product.name}${
      product.dimensions ? ` - Kích thước: ${product.dimensions}` : ""
    }${product.material ? ` - Vật liệu: ${product.material}` : ""}${
      product.description ? ` - Mô tả: ${product.description}` : ""
    }`;

    const textarea = document.getElementById("requirements") as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = textToFill;
      // Kích hoạt sự kiện input để React state nhận giá trị
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      // Cuộn xuống khu vực đặt hàng
      const orderSec = document.getElementById("order") || textarea;
      orderSec.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => textarea.focus(), 600);

      setSelectedNotification(`Đã áp dụng mẫu "${product.name}" vào yêu cầu gia công phía dưới!`);
      setTimeout(() => setSelectedNotification(null), 4000);
    }
  };

  // Màu sắc badge danh mục
  const getCategoryColor = (cat: string) => {
    if (/kệ|tủ/i.test(cat)) return "bg-purple-100 text-purple-800 border-purple-200";
    if (/bàn|khung/i.test(cat)) return "bg-blue-100 text-blue-800 border-blue-200";
    if (/hộp|vỏ/i.test(cat)) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (/pát|chi tiết/i.test(cat)) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <section id="products" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 scroll-mt-10">
      {/* Tiêu đề & Giới thiệu */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-block rounded-full bg-blue-100 px-3.5 py-1 text-xs font-bold text-blue-800 tracking-wider uppercase mb-2.5">
          Danh mục sản phẩm thực tế
        </span>
        <h2 className="text-3xl font-extrabold uppercase text-[#0f2a5c] sm:text-4xl tracking-tight">
          Một số sản phẩm mẫu
        </h2>
        <p className="mt-3 text-slate-600 text-sm sm:text-base">
          Các sản phẩm tiêu biểu được gia công cơ khí chính xác tại xưởng CNC. Bấm vào bất kỳ sản phẩm nào để đọc thông số chi tiết hoặc đặt gia công.
        </p>
      </div>

      {/* Thông báo nổi khi chọn mẫu */}
      {selectedNotification && (
        <div className="mt-6 mx-auto max-w-lg rounded-2xl bg-emerald-600 p-3 text-center text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition animate-bounce">
          ✓ {selectedNotification}
        </div>
      )}

      {/* Bộ lọc danh mục & Tìm kiếm */}
      <div className="mt-10 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs Danh mục sản phẩm */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 scale-105"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.category === cat).length;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 scale-105"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Ô tìm kiếm nhanh */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm mẫu sản phẩm..."
              className="w-full rounded-full border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 shadow-xs"
            />
            <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lưới sản phẩm */}
      <div className="mt-8">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center text-slate-500">
            <p className="text-base font-semibold text-slate-700">Chưa có sản phẩm mẫu trong danh mục này</p>
            <p className="text-xs text-slate-400 mt-1">
              Thử tìm kiếm từ khóa khác hoặc bấm &quot;Tất cả&quot; để xem toàn bộ sản phẩm của xưởng.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <article
                key={p.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10"
              >
                {/* Phần có thể click để vào trang chi tiết & tùy biến CAD */}
                <Link
                  href={`/product/${p.id}`}
                  className="block cursor-pointer flex-1"
                  title={`Xem chi tiết & tùy biến bản vẽ CAD cho ${p.name}`}
                >
                  {/* Ảnh sản phẩm */}
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/800x600/0f2a5c/ffffff?text=CNC+Product";
                      }}
                    />
                    {/* Badge danh mục */}
                    <span
                      className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-bold shadow-xs backdrop-blur-xs ${getCategoryColor(
                        p.category
                      )}`}
                    >
                      {p.category}
                    </span>

                    {/* Lớp phủ hover Xem chi tiết */}
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                      <span className="rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition duration-300 flex items-center gap-1.5">
                        <span>📐</span> Tùy biến tham số CAD
                      </span>
                    </div>
                  </div>

                  {/* Nội dung thông tin */}
                  <div className="p-5 space-y-2.5">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition line-clamp-1 flex items-center justify-between">
                      <span>{p.name}</span>
                      <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition">
                        ›
                      </span>
                    </h3>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      {p.dimensions && (
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          <span className="text-slate-400">Gốc:</span>
                          <span>{p.dimensions}</span>
                        </div>
                      )}
                      {p.material && (
                        <div className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 truncate max-w-full">
                          <span>🔩</span>
                          <span className="truncate">{p.material}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 min-h-[36px]">
                      {p.description || "Gia công cơ khí tinh xảo bằng máy phay tiện CNC và cắt laser chất lượng cao."}
                    </p>
                  </div>
                </Link>

                {/* Footer thẻ: Giá & Nút Chi tiết + Đặt Mẫu */}
                <div className="border-t border-slate-100 bg-slate-50/60 p-4 flex items-center justify-between gap-2">
                  <Link
                    href={`/product/${p.id}`}
                    className="cursor-pointer"
                  >
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Giá tham khảo</span>
                    <span className="text-sm font-extrabold text-blue-700">
                      {p.price ? formatVND(p.price) : "Liên hệ báo giá"}
                    </span>
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/product/${p.id}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer"
                    >
                      Chi tiết
                    </Link>
                    <Link
                      href={`/product/${p.id}#parametric-order`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 hover:shadow-md transition cursor-pointer"
                    >
                      <span>⚡ Đặt mẫu</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
