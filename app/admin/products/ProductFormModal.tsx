"use client";

import { useActionState, useEffect, useState } from "react";
import { saveProduct, type ProductFormState } from "./actions";
import { DEFAULT_CATEGORIES, type ProductItem } from "@/lib/data/product-types";
import { formatVND } from "@/lib/format";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  existingCategories: string[];
};

const initialState: ProductFormState = {};

export default function ProductFormModal({ isOpen, onClose, product, existingCategories }: Props) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [material, setMaterial] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [baseAiContext, setBaseAiContext] = useState("");
  const [cadTemplate, setCadTemplate] = useState("");
  const [showAdvancedAi, setShowAdvancedAi] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setCategory(product.category || DEFAULT_CATEGORIES[0]);
      setDimensions(product.dimensions || "");
      setMaterial(product.material || "");
      setPrice(product.price ? String(product.price) : "");
      setDescription(product.description || "");
      setImageUrl(product.imageUrl || "");
      setPreviewSrc(product.imageUrl || "");
      setBaseAiContext(product.baseAiContext || "");
      setCadTemplate(
        product.cadTemplate
          ? typeof product.cadTemplate === "string"
            ? product.cadTemplate
            : JSON.stringify(product.cadTemplate, null, 2)
          : ""
      );
    } else {
      setName("");
      setCategory(DEFAULT_CATEGORIES[0]);
      setDimensions("");
      setMaterial("");
      setPrice("");
      setDescription("");
      setImageUrl("");
      setPreviewSrc("");
      setBaseAiContext("");
      setCadTemplate("");
      setShowAdvancedAi(false);
    }
  }, [product, isOpen]);











  // Đóng modal khi thành công
  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewSrc(objectUrl);
    }
  };

  const allCategorySuggestions = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...existingCategories.filter(Boolean)])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#0f2a5c]">
              {product ? "Chỉnh sửa sản phẩm mẫu" : "Thêm sản phẩm mẫu mới"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sản phẩm sẽ hiển thị trực tiếp ở mục &quot;Một số sản phẩm mẫu&quot; trên trang chủ.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {state.error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
            ⚠️ {state.error}
          </div>
        )}

        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={product?.id || ""} />
          <input type="hidden" name="existingImageUrl" value={product?.imageUrl || ""} />

          {/* Tên sản phẩm */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên sản phẩm mẫu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Kệ để dép 4 tầng thép hộp, Bàn làm việc CNC..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Danh mục sản phẩm */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Danh mục sản phẩm <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allCategorySuggestions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${category === cat
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              name="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Hoặc nhập tên danh mục mới tùy chỉnh..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Kích thước & Giá */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quy cách / Kích thước phủ bì
              </label>
              <input
                type="text"
                name="dimensions"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="VD: 800 × 300 × 750 mm"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Giá tham khảo (VNĐ)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="VD: 1200000"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
                {price && !isNaN(Number(price)) && Number(price) > 0 && (
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-blue-700">
                    ≈ {formatVND(Number(price))}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Vật liệu chế tạo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Vật liệu chế tạo / Tiêu chuẩn kim loại
            </label>
            <input
              type="text"
              name="material"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="VD: Thép tấm SS400 2mm, Nhôm A5052, Inox 304, Thép hộp 40×40..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Ảnh sản phẩm (Upload hoặc URL) */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 space-y-3">
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Hình ảnh đại diện sản phẩm
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* Preview Box */}
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-center">
                {previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewSrc}
                    alt="Xem trước"
                    className="h-full w-full object-cover"
                    onError={() => setPreviewSrc("https://placehold.co/800x600/0f2a5c/ffffff?text=Loi+Anh")}
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400 text-xs">
                    <span className="text-2xl block mb-1">📷</span>
                    Chưa có ảnh
                  </div>
                )}
              </div>

              {/* Upload & URL Input */}
              <div className="sm:col-span-2 space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Cách 1: Tải ảnh từ máy tính (PNG, JPG, WEBP tối đa 8MB)
                  </label>
                  <input
                    type="file"
                    name="imageFile"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-600 file:mr-2.5 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                  />
                </div>

                <div className="relative flex py-0.5 items-center">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-slate-400">Hoặc</span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Cách 2: Nhập đường dẫn link ảnh trực tiếp
                  </label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setPreviewSrc(e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mô tả sản phẩm */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mô tả chi tiết / Vật liệu &amp; Gia công
            </label>
            <textarea
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Khung thép hộp 40x40 hàn liên kết mài phẳng, sơn tĩnh điện sần chống trầy, độ bền cao..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Cấu hình Tham số AI & CAD Template (Parametric Design) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <button
              type="button"
              onClick={() => setShowAdvancedAi(!showAdvancedAi)}
              className="flex w-full items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-blue-600 transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <span>🤖</span>
                <span>Cấu hình AI Parametric &amp; Bản vẽ CAD tham số (Nâng cao)</span>
              </span>
              <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {showAdvancedAi ? "Thu gọn ▲" : "Tùy biến ▼"}
              </span>
            </button>

            {showAdvancedAi && (
              <div className="pt-2 border-t border-slate-200/80 space-y-3">
                <p className="text-[11px] text-slate-500">
                  💡 Nếu để trống, hệ thống sẽ tự động khởi tạo template CAD và bối cảnh kỹ thuật dựa trên quy cách và vật liệu phía trên.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ngữ cảnh kỹ thuật AI (baseAiContext)
                  </label>
                  <textarea
                    name="baseAiContext"
                    rows={2}
                    value={baseAiContext}
                    onChange={(e) => setBaseAiContext(e.target.value)}
                    placeholder="VD: Pát đỡ chữ L chịu lực có gân tăng cứng tam giác khoét 3 lỗ tròn cơ khí..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cấu trúc CAD Template (JSON chuẩn)
                  </label>
                  <textarea
                    name="cadTemplate"
                    rows={6}
                    value={cadTemplate}
                    onChange={(e) => setCadTemplate(e.target.value)}
                    placeholder='{"title": "...", "baseDimensions": {"length": 300, "width": 50, "height": 200, "thickness": 4}, "parts": [...], "holes": [...]}'
                    className="w-full font-mono rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-60 cursor-pointer"
            >
              {pending ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>✓ {product ? "Cập nhật sản phẩm" : "Lưu sản phẩm"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
