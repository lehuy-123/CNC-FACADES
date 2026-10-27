"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { type ProductItem } from "@/lib/data/product-types";
import { formatVND } from "@/lib/format";
import { deleteProduct } from "./actions";
import ProductFormModal from "./ProductFormModal";

type Props = {
  initialProducts: ProductItem[];
};

export default function ProductListClient({ initialProducts }: Props) {
  const [products] = useState<ProductItem[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Danh sách các danh mục duy nhất
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  // Lọc sản phẩm theo tìm kiếm và danh mục
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.dimensions && p.dimensions.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm mẫu "${name}" không?`)) {
      startTransition(async () => {
        const fd = new FormData();
        fd.append("id", id);
        await deleteProduct(fd);
      });
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Header & Nút thêm mới */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2a5c]">Quản lý sản phẩm mẫu</h1>
          <p className="mt-1 text-sm text-slate-600">
            Các sản phẩm mẫu đại diện cho xưởng CNC, hiển thị trên trang chủ theo từng danh mục.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition cursor-pointer self-start sm:self-auto"
        >
          <span className="text-lg leading-none">+</span> Thêm sản phẩm mẫu
        </button>
      </div>

      {/* Thống kê nhanh */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium uppercase text-slate-500">Tổng sản phẩm mẫu</p>
          <p className="mt-1 text-3xl font-extrabold text-[#0f2a5c]">{products.length}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium uppercase text-slate-500">Số danh mục</p>
          <p className="mt-1 text-3xl font-extrabold text-blue-700">{categories.length}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium uppercase text-slate-500">Có báo giá tham khảo</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-600">
            {products.filter((p) => p.price && p.price > 0).length}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-xs flex flex-col justify-center">
          <p className="text-xs text-slate-500">Xem trực tiếp trên website</p>
          <Link
            href="/#products"
            target="_blank"
            className="mt-1 text-sm font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1"
          >
            Trang chủ &quot;Sản phẩm mẫu&quot; ↗
          </Link>
        </div>
      </div>

      {/* Thanh tìm kiếm & Bộ lọc danh mục */}
      <div className="mt-8 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên sản phẩm, kích thước, vật liệu..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 shadow-xs"
            />
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <span className="text-xs text-slate-500 self-center">
            Hiển thị <strong className="text-slate-800">{filteredProducts.length}</strong> / {products.length} sản phẩm
          </span>
        </div>

        {/* Tab Danh mục */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600"
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
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-blue-600 text-white shadow-xs"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Danh sách thẻ sản phẩm */}
      <div className="mt-6">
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <p className="text-base font-semibold text-slate-700">Không tìm thấy sản phẩm mẫu phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">
              Thử xóa từ khóa tìm kiếm hoặc chọn danh mục khác, hoặc thêm sản phẩm mẫu mới.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700"
            >
              + Thêm sản phẩm mẫu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition"
              >
                <div>
                  {/* Ảnh sản phẩm */}
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/800x600/0f2a5c/ffffff?text=CNC+Product";
                      }}
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 backdrop-blur-xs px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                      {p.category}
                    </span>
                  </div>

                  {/* Thông tin sản phẩm */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-slate-900 text-base line-clamp-1">{p.name}</h3>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      {p.dimensions && (
                        <div className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          <span>📏</span> {p.dimensions}
                        </div>
                      )}
                      {p.material && (
                        <div className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          <span>🔩</span> {p.material}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed min-h-[32px]">
                      {p.description || "Chưa có mô tả chi tiết."}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Giá tham khảo:</span>
                      <span className="font-extrabold text-blue-700 text-sm">
                        {p.price ? formatVND(p.price) : "Liên hệ báo giá"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nút tác vụ (Sửa / Xóa) */}
                <div className="border-t border-slate-100 bg-slate-50/60 p-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 truncate max-w-[130px]" title={p.id}>
                    Mã: {p.id.slice(0, 8)}...
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer"
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(p.id, p.name)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:border-red-300 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Thêm / Sửa sản phẩm mẫu */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        existingCategories={categories}
      />
    </>
  );
}
