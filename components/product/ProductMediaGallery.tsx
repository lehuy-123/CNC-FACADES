"use client";

import { useState } from "react";

type Props = {
  name: string;
  category: string;
  imageUrl: string;
  cadImageUrl?: string | null;
};

export default function ProductMediaGallery({ name, category, imageUrl, cadImageUrl }: Props) {
  const [activeTab, setActiveTab] = useState<"3d" | "cad">("3d");
  const [isZoomed, setIsZoomed] = useState(false);

  const currentSrc = activeTab === "3d" || !cadImageUrl ? imageUrl : cadImageUrl;

  return (
    <div className="space-y-3">
      {/* Khung ảnh chính */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/5 shadow-inner group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={name}
          onClick={() => setIsZoomed(true)}
          className="h-full w-full object-contain sm:object-cover transition duration-500 group-hover:scale-102 cursor-zoom-in"
        />

        {/* Badge danh mục */}
        <span className="absolute left-3 top-3 rounded-full bg-blue-600/90 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-xs">
          {category}
        </span>

        {/* Nút phóng to */}
        <button
          type="button"
          onClick={() => setIsZoomed(true)}
          className="absolute right-3 top-3 rounded-xl bg-slate-900/60 p-2 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition shadow hover:bg-slate-900 cursor-pointer"
          title="Phóng to ảnh"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>

        {/* Chú thích góc dưới */}
        <div className="absolute bottom-3 inset-x-3 rounded-xl bg-slate-900/75 backdrop-blur-md px-3 py-1.5 text-[11px] font-medium text-white flex items-center justify-between pointer-events-none">
          <span>{activeTab === "3d" ? "📸 Ảnh 3D phối cảnh thực tế" : "📐 Bản vẽ kỹ thuật CAD chuẩn số đo"}</span>
          <span className="text-slate-300">Click để phóng to</span>
        </div>
      </div>

      {/* Tabs chuyển đổi giữa Phối cảnh 3D và Bản vẽ CAD */}
      {cadImageUrl && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("3d")}
            className={`flex items-center gap-2 rounded-xl p-2.5 border text-xs font-bold transition text-left cursor-pointer ${
              activeTab === "3d"
                ? "border-blue-600 bg-blue-50 text-blue-800 shadow-xs"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="3D Phối cảnh"
              className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0"
            />
            <div className="overflow-hidden">
              <span className="block truncate">3D Phối cảnh</span>
              <span className="block text-[10px] font-normal text-slate-500">Mẫu hoàn thiện</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cad")}
            className={`flex items-center gap-2 rounded-xl p-2.5 border text-xs font-bold transition text-left cursor-pointer ${
              activeTab === "cad"
                ? "border-blue-600 bg-blue-50 text-blue-800 shadow-xs"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cadImageUrl}
              alt="Bản vẽ CAD"
              className="h-10 w-10 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
            />
            <div className="overflow-hidden">
              <span className="block truncate">Bản vẽ CAD 2D</span>
              <span className="block text-[10px] font-normal text-slate-500">Mặt đứng & số đo</span>
            </div>
          </button>
        </div>
      )}

      {/* Modal phóng to xem nét chi tiết */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentSrc}
              alt={name}
              className="max-h-[85vh] w-auto object-contain mx-auto rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

