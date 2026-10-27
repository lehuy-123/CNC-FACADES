"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import Link from "next/link";
import { type ProductItem } from "@/lib/data/product-types";
import { submitOrder, type OrderFormState } from "@/actions/order.action";
import {
  generateParametricDesign,
  type UserParametricInputs,
  type ParametricDesignResult,
} from "@/actions/ai-sketch.action";
import type { CadSpec } from "@/lib/cad-drawing";

type Props = {
  product?: ProductItem | null;
};

const initialState: OrderFormState = { status: "idle" };

export default function OrderForm({ product }: Props) {
  const [formState, formAction, isPendingOrder] = useActionState(submitOrder, initialState);
  const [isCalculating, startCalculating] = useTransition();

  // Hàm trích xuất kích thước chính xác từ template hoặc quy cách sản phẩm
  function extractBaseDimensions(p?: ProductItem | null) {
    if (!p) {
      return { length: 800, width: 300, height: 200, thickness: 2 };
    }

    let tpl = p.cadTemplate as any;
    if (typeof tpl === "string") {
      try {
        tpl = JSON.parse(tpl);
      } catch {
        // ignore
      }
    }

    const baseDim = tpl && typeof tpl === "object" ? tpl.baseDimensions : null;
    if (baseDim && Number(baseDim.length) > 0 && Number(baseDim.width) > 0 && Number(baseDim.height) > 0) {
      return {
        length: Number(baseDim.length),
        width: Number(baseDim.width),
        height: Number(baseDim.height),
        thickness: Number(baseDim.thickness) || 4,
      };
    }

    // Phân tích chuỗi dimensions ví dụ "1500 × 500 × 1600 mm" hoặc "800 x 300 x 200" hoặc "Phi 250 x 16 mm"
    const rawDim = String(p.dimensions || "");
    const phiMatch = rawDim.match(/phi\s*(\d+)\s*[×x*]\s*(\d+)/i);
    if (phiMatch) {
      const dia = parseInt(phiMatch[1], 10);
      const thick = parseInt(phiMatch[2], 10);
      return { length: dia, width: dia, height: thick, thickness: thick };
    }

    const match = rawDim.match(/(\d+)\s*[×x*]\s*(\d+)(?:\s*[×x*]\s*(\d+))?/i);
    if (match) {
      const l = parseInt(match[1], 10);
      const w = parseInt(match[2], 10);
      const h = match[3] ? parseInt(match[3], 10) : 200;

      const matThickMatch = (p.material || "").match(/(\d+(?:\.\d+)?)\s*mm/i);
      const thick = matThickMatch ? parseFloat(matThickMatch[1]) : 2;
      return { length: l, width: w, height: h, thickness: thick };
    }

    return { length: 800, width: 300, height: 200, thickness: 2 };
  }

  const initialDim = extractBaseDimensions(product);

  // State các trường tham số số học (mm)
  const [length, setLength] = useState<number>(initialDim.length);
  const [width, setWidth] = useState<number>(initialDim.width);
  const [height, setHeight] = useState<number>(initialDim.height);
  const [thickness, setThickness] = useState<number>(initialDim.thickness);
  const [notes, setNotes] = useState<string>("");

  // State thông tin khách hàng
  const [customerName, setCustomerName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // State kết quả CAD
  const [cadResult, setCadResult] = useState<ParametricDesignResult | null>(null);
  const [cadSpec, setCadSpec] = useState<CadSpec | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [dxfUrl, setDxfUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cad2d" | "parts">("cad2d");
  const [copied, setCopied] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Tự động đồng bộ các trường số học và sinh bản vẽ CAD ban đầu theo đúng template của sản phẩm này
  useEffect(() => {
    if (product?.id) {
      const dim = extractBaseDimensions(product);
      setLength(dim.length);
      setWidth(dim.width);
      setHeight(dim.height);
      setThickness(dim.thickness);
      setNotes("");
      setCalcError(null);

      const inputs: UserParametricInputs = {
        length: dim.length,
        width: dim.width,
        height: dim.height,
        thickness: dim.thickness,
        notes: "",
      };

      startCalculating(async () => {
        try {
          const res = await generateParametricDesign(product.id, inputs);
          if (res.success && res.svgUrl) {
            setCadResult(res);
            setSvgUrl(res.svgUrl);
            setDxfUrl(res.dxfUrl || null);
            if (res.cadSpec) setCadSpec(res.cadSpec);
          } else {
            setCalcError(res.message || "Không thể tính toán bản vẽ tham số.");
          }
        } catch (err) {
          console.error("Calculate CAD error:", err);
          setCalcError("Đã có sự cố khi gọi engine tính toán CAD.");
        }
      });
    }
  }, [product?.id]);

  const handleCalculateCAD = () => {
    if (!product?.id) return;
    setCalcError(null);

    const inputs: UserParametricInputs = {
      length: Number(length),
      width: Number(width),
      height: Number(height),
      thickness: Number(thickness),
      notes: notes.trim(),
    };

    startCalculating(async () => {
      try {
        const res = await generateParametricDesign(product.id, inputs);
        if (res.success && res.svgUrl) {
          setCadResult(res);
          setSvgUrl(res.svgUrl);
          setDxfUrl(res.dxfUrl || null);
          if (res.cadSpec) setCadSpec(res.cadSpec);
        } else {
          setCalcError(res.message || "Không thể tính toán bản vẽ tham số. Vui lòng thử lại.");
        }
      } catch (err) {
        console.error("Calculate CAD error:", err);
        setCalcError("Đã có sự cố khi gọi engine tính toán CAD.");
      }
    });
  };

  // Tạo chuỗi mô tả yêu cầu tự động chuẩn hóa
  const formattedRequirements = product
    ? `Đặt gia công theo mẫu đã khóa: ${product.name} (ID: ${product.id}).\nThông số tùy biến: Dài ${length}mm × Rộng ${width}mm × Cao ${height}mm × Dày ${thickness}mm.${notes.trim() ? `\nGhi chú biến tấu: ${notes.trim()}` : ""
    }`
    : `Yêu cầu gia công cơ khí: Dài ${length}mm × Rộng ${width}mm × Cao ${height}mm × Dày ${thickness}mm.${notes.trim() ? ` Ghi chú: ${notes.trim()}` : ""
    }`;

  const modifiedParamsPayload = JSON.stringify({
    productId: product?.id,
    productName: product?.name,
    length,
    width,
    height,
    thickness,
    notes,
    cadSpecTitle: cadSpec?.title,
    calculatedAt: new Date().toISOString(),
  });

  return (
    <div className="space-y-8">
      {/* 1. BANNER THÔNG BÁO NỔI BẬT: KHÓA BỐI CẢNH THEO BẢN VẼ GỐC */}
      {product && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500/40 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/30 px-3 py-1 text-xs font-bold text-blue-200 border border-blue-400/30 backdrop-blur-xs">
                <span>🔒 Đang khóa bối cảnh theo bản vẽ:</span>
                <span className="text-white underline decoration-blue-400">{product.name}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Mô hình Parametric Design: Chống sai lệch 100%
              </h2>
              <p className="text-xs sm:text-sm text-blue-200/90 max-w-2xl leading-relaxed">
                Hệ thống chỉ co giãn kích thước toán học dựa trên khuôn mẫu chuẩn của xưởng. AI cam kết{" "}
                <span className="font-semibold text-emerald-300">không tự bịa</span> các chi tiết sai lệch kết cấu cơ khí.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white/10 p-3 border border-white/15 backdrop-blur-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-14 w-14 rounded-lg object-cover border border-white/20"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/100x100/0f2a5c/ffffff?text=CNC";
                }}
              />
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-white line-clamp-1">{product.name}</p>
                <p className="text-[11px] text-blue-200">Gốc: {product.dimensions || "Chuẩn xưởng"}</p>
                <p className="text-[11px] text-emerald-300 font-semibold truncate max-w-[150px]">
                  {product.material || "Thép kết cấu SS400"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FORM ĐIỀU CHỈNH THAM SỐ VÀ PREVIEW CAD */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* CỘT TRÁI: BẢNG ĐIỀU KHIỂN THAM SỐ SỐ HỌC (4 KÍCH THƯỚC) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>📐</span>
              <span>Thông số tùy biến (Parametric Inputs)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhập các giá trị (mm). AI sẽ tính toán lại tỷ lệ các thanh giằng và tấm theo đúng công thức CAD.
            </p>
          </div>

          {/* 4 TRƯỜNG INPUT SỐ RIÊNG BIỆT */}
          <div className="grid grid-cols-2 gap-4">
            {/* Chiều Dài */}
            <div className="space-y-1.5">
              <label htmlFor="param-length" className="block text-xs font-bold text-slate-700">
                Chiều Dài (L) <span className="text-blue-600 font-normal">mm</span>
              </label>
              <div className="relative">
                <input
                  id="param-length"
                  type="number"
                  min={50}
                  max={6000}
                  step={5}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition"
                  placeholder="800"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Chiều Rộng / Sâu */}
            <div className="space-y-1.5">
              <label htmlFor="param-width" className="block text-xs font-bold text-slate-700">
                Chiều Rộng (W / Sâu) <span className="text-blue-600 font-normal">mm</span>
              </label>
              <div className="relative">
                <input
                  id="param-width"
                  type="number"
                  min={50}
                  max={3000}
                  step={5}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition"
                  placeholder="300"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Chiều Cao */}
            <div className="space-y-1.5">
              <label htmlFor="param-height" className="block text-xs font-bold text-slate-700">
                Chiều Cao (H) <span className="text-blue-600 font-normal">mm</span>
              </label>
              <div className="relative">
                <input
                  id="param-height"
                  type="number"
                  min={20}
                  max={4000}
                  step={5}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition"
                  placeholder="200"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                  mm
                </span>
              </div>
            </div>

            {/* Độ Dày */}
            <div className="space-y-1.5">
              <label htmlFor="param-thickness" className="block text-xs font-bold text-slate-700">
                Độ Dày (T) <span className="text-blue-600 font-normal">mm</span>
              </label>
              <div className="relative">
                <input
                  id="param-thickness"
                  type="number"
                  min={0.5}
                  max={50}
                  step={0.5}
                  value={thickness}
                  onChange={(e) => setThickness(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition"
                  placeholder="2.0"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                  mm
                </span>
              </div>
            </div>
          </div>

          {/* GHI CHÚ BIẾN TẤU */}
          <div className="space-y-1.5">
            <label htmlFor="param-notes" className="block text-xs font-bold text-slate-700">
              Ghi chú biến tấu <span className="text-slate-400 font-normal">(Tùy chọn)</span>
            </label>
            <textarea
              id="param-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: khoét thêm lỗ dây điện phi 25mm ở đáy, gắn thêm tai bắt vít nở..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition"
            />
          </div>

          {/* NÚT TÍNH TOÁN LẠI CAD */}
          <button
            type="button"
            onClick={handleCalculateCAD}
            disabled={isCalculating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 cursor-pointer"
          >
            {isCalculating ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>AI đang tính toán hình học CAD...</span>
              </>
            ) : (
              <>
                <span>⚙️ Cập nhật &amp; Tính toán tham số CAD</span>
              </>
            )}
          </button>

          {calcError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {calcError}
            </div>
          )}

          {/* THÔNG TIN GỐC CỦA SẢN PHẨM */}
          {product && (
            <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1.5 border border-slate-100">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>📋</span>
                <span>Bối cảnh kỹ thuật gốc:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                {product.baseAiContext || "Bản vẽ dập chấn & cắt CNC định hình tiêu chuẩn."}
              </p>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: HIỂN THỊ BẢN VẼ 2D SVG / CANVAS ĐƯỢC RENDER TỪ JSON */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>📐</span>
                <span>Bản vẽ kỹ thuật 2D CAD (Render từ JSON)</span>
              </h3>
              <p className="text-xs text-slate-500">
                {cadResult?.provider || "Tính toán tỷ lệ hình học chính xác 100%"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("cad2d")}
                  className={`rounded-md px-3 py-1 font-semibold transition ${activeTab === "cad2d" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Bản vẽ 2D
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("parts")}
                  className={`rounded-md px-3 py-1 font-semibold transition ${activeTab === "parts" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Bóc tách ({cadSpec?.parts.length || 0} chi tiết)
                </button>
              </div>

              {dxfUrl && (
                <a
                  href={dxfUrl}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  title="Tải file AutoCAD DXF mở trực tiếp trên máy tính"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>DXF R12</span>
                </a>
              )}
            </div>
          </div>

          {/* VÙNG PREVIEW SVG / PLACEHOLDER */}
          <div className="relative min-h-[420px] rounded-xl border border-slate-200 bg-slate-900/5 overflow-hidden flex items-center justify-center p-2">
            {isCalculating ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">Đang tái tính toán tọa độ CAD...</p>
                  <p className="text-xs text-slate-500">
                    Cân bằng tỷ lệ hình học: Dài {length} × Rộng {width} × Cao {height} mm
                  </p>
                </div>
              </div>
            ) : activeTab === "cad2d" && svgUrl ? (
              <div className="w-full flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={svgUrl}
                  alt="Bản vẽ CAD kỹ thuật"
                  className="w-full h-auto max-h-[520px] object-contain rounded-lg border border-slate-200 bg-white shadow-inner"
                />
                <div className="mt-2 flex w-full items-center justify-between px-2 text-[11px] text-slate-500">
                  <span>Hệ trục: 3 Hình chiếu + Trục đo Isometric + Khung tên xưởng</span>
                  <a
                    href={svgUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Xem toàn màn hình ↗
                  </a>
                </div>
              </div>
            ) : activeTab === "parts" && cadSpec ? (
              <div className="w-full h-full max-h-[500px] overflow-auto p-2 bg-white rounded-lg">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-[11px] uppercase font-bold text-slate-600">
                    <tr>
                      <th className="p-2">STT</th>
                      <th className="p-2">Tên chi tiết</th>
                      <th className="p-2">Kích thước (W × H × D mm)</th>
                      <th className="p-2">Tọa độ gốc (X, Y, Z)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cadSpec.parts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900">{p.name}</td>
                        <td className="p-2 font-mono text-blue-700">
                          {p.w} × {p.h} × {p.d}
                        </td>
                        <td className="p-2 font-mono text-slate-500 text-[11px]">
                          ({p.x}, {p.y}, {p.z})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-8 space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 text-2xl font-bold">
                  📐
                </div>
                <h4 className="text-sm font-bold text-slate-800">Chưa có bản vẽ tham số</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Nhấn vào nút &quot;Cập nhật &amp; Tính toán tham số CAD&quot; ở bên trái để sinh bản vẽ 2D từ template.
                </p>
              </div>
            )}
          </div>

          {/* BADGE THỐNG KÊ NHANH */}
          {cadSpec && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Kích thước bóc tách</div>
                <div className="font-bold text-slate-900 text-xs">
                  {length} × {width} × {height} mm
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Độ dày vật liệu</div>
                <div className="font-bold text-slate-900 text-xs">{thickness} mm</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Số chi tiết phôi</div>
                <div className="font-bold text-slate-900 text-xs">{cadSpec.parts.length} chi tiết</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Lỗ kỹ thuật</div>
                <div className="font-bold text-slate-900 text-xs">
                  {cadSpec.holes.length > 0 ? `${cadSpec.holes.length} lỗ định vị` : "Không khoét lỗ"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. PHẦN GỬI ĐƠN ĐẶT HÀNG GIA CÔNG */}
      <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-extrabold text-slate-900">
            Thông tin đặt hàng &amp; Nhận báo giá chính xác
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Xưởng CNC sẽ nhận đầy đủ bản vẽ CAD tham số cùng toàn bộ kích thước bạn đã điều chỉnh để lên báo giá ngay.
          </p>
        </div>

        {/* Thông báo thành công */}
        {formState.status === "success" && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white text-xl font-bold">
                ✓
              </span>
              <div>
                <h4 className="text-base font-bold text-emerald-950">
                  Gửi yêu cầu gia công thành công!
                </h4>
                <p className="text-xs text-emerald-800">
                  Kỹ thuật viên của xưởng đã nhận được bản vẽ CAD tham số và sẽ gọi cho bạn trong ít phút.
                </p>
              </div>
            </div>

            {formState.orderCode && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 border border-emerald-200">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Mã tra cứu đơn:</span>
                  <div className="font-mono text-xl font-black text-blue-700 tracking-wider">
                    {formState.orderCode}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formState.orderCode || "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    {copied ? "✓ Đã copy" : "Copy mã"}
                  </button>
                  <Link
                    href={`/tra-cuu?q=${formState.orderCode}`}
                    className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Tra cứu tiến độ ngay →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Thông báo lỗi */}
        {formState.status === "error" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
            {formState.message || "Vui lòng kiểm tra lại thông tin gửi đơn."}
          </div>
        )}

        {/* Form Inputs khách hàng */}
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
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            {formState.fieldErrors?.customerName && (
              <p className="text-xs text-rose-600">{formState.fieldErrors.customerName}</p>
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901 234 567"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            {formState.fieldErrors?.phone && (
              <p className="text-xs text-rose-600">{formState.fieldErrors.phone}</p>
            )}
          </div>
        </div>

        {/* Honeypot chống spam */}
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

        {/* Các input ẩn đóng gói bối cảnh và tham số đã khóa */}
        <input type="hidden" name="requirements" value={formattedRequirements} />
        <input type="hidden" name="modifiedParams" value={modifiedParamsPayload} />
        <input type="hidden" name="aiSketchUrl" value={svgUrl || ""} />
        <input type="hidden" name="aiDxfUrl" value={dxfUrl || ""} />

        <button
          type="submit"
          disabled={isPendingOrder}
          className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base sm:text-lg font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
        >
          {isPendingOrder ? "Đang gửi đơn hàng cho xưởng..." : "Gửi đơn gia công theo tham số đã khóa"}
        </button>
      </form>
    </div>
  );
}
