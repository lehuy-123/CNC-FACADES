"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  type CadSpec,
  type CadPart,
  type CadHole,
  sanitizeSpec,
  bounds,
  renderSvg,
  renderDxf,
  render3dViewSvg,
} from "@/lib/cad-drawing";
import { prisma } from "@/lib/prisma";
import { getProductById, INITIAL_PRODUCTS } from "@/lib/data/products";

export type AiSketchStyle = "blueprint" | "render3d";

export type AiSketchImage = {
  url: string;
  label: string;
  sub: string;
  angle: "perspective" | "front" | "top" | "photo";
  type: "3d" | "photo";
};

export type AiSketchResult = {
  success: boolean;
  imageUrl?: string;
  images?: AiSketchImage[];
  dxfUrl?: string;
  isCadDrawing?: boolean;
  cadSpec?: CadSpec;
  message?: string;
  provider?: string;
  usedPrompt?: string;
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const GEMINI_IMAGE_MODELS = [
  "gemini-3-pro-image",
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image",
];

const GEMINI_TEXT_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];

function geminiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
}

// ---------------------------------------------------------------------------
// 1. TẠO BẢN VẼ KỸ THUẬT CAD 2D THỰC THỤ (SVG Vector + File AutoCAD DXF)
// ---------------------------------------------------------------------------

/**
 * Thuật toán quy tắc cơ khí tham số dự phòng (Parametric Fallback Engine)
 * Phân tích chuẩn xác danh mục sản phẩm (kệ để dép, sào phơi, bàn, tủ, mặt bích, bản mã...)
 * và trích xuất kích thước mm kể cả khi không có kết nối API ngoài.
 */
function buildParametricCadSpec(desc: string): CadSpec {
  const lower = desc.toLowerCase();

  // 1. Phân tích số tầng nếu có (2 -> 6 tầng)
  let tiers = 3;
  const tierMatch = lower.match(/(\d+)\s*(?:tầng|ngăn|đợt)/);
  if (tierMatch) tiers = Math.max(2, Math.min(6, parseInt(tierMatch[1], 10)));

  // 2. Hàm trích xuất giá trị kích thước sang mm (1m5 -> 1500, 80cm -> 800, 1200mm -> 1200)
  function parseVal(s?: string): number {
    if (!s) return 0;
    const clean = s.trim().replace(",", ".");
    const mCm = clean.match(/^(\d+)m(\d+)$/);
    if (mCm) {
      const m = parseInt(mCm[1], 10);
      const cm = mCm[2].length === 1 ? parseInt(mCm[2], 10) * 100 : parseInt(mCm[2], 10) * 10;
      return m * 1000 + cm;
    }
    const mMatch = clean.match(/^(\d+(?:\.\d+)?)\s*m(?:ét)?$/);
    if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000);
    const cmMatch = clean.match(/^(\d+(?:\.\d+)?)\s*cm$/);
    if (cmMatch) return Math.round(parseFloat(cmMatch[1]) * 10);
    const mmMatch = clean.match(/^(\d+(?:\.\d+)?)\s*mm$/);
    if (mmMatch) return Math.round(parseFloat(mmMatch[1]));
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    if (num < 10) return Math.round(num * 1000);
    if (num < 100) return Math.round(num * 10);
    return Math.round(num);
  }

  let length = 0;
  let depth = 0;
  let height = 0;

  // Trích xuất theo nhãn: dài, cao, sâu / rộng
  const daiMatch = lower.match(/(?:dài|chiều dài|ngang)\s*[:=]?\s*(\d+(?:[.,]\d+)?\s*(?:m\d+|m|cm|mm)?)/);
  if (daiMatch) length = parseVal(daiMatch[1]);
  const caoMatch = lower.match(/(?:cao|chiều cao)\s*[:=]?\s*(\d+(?:[.,]\d+)?\s*(?:m\d+|m|cm|mm)?)/);
  if (caoMatch) height = parseVal(caoMatch[1]);
  const sauMatch = lower.match(/(?:sâu|rộng|chiều sâu|chiều rộng|bản rộng)\s*[:=]?\s*(\d+(?:[.,]\d+)?\s*(?:m\d+|m|cm|mm)?)/);
  if (sauMatch) depth = parseVal(sauMatch[1]);

  // Trích xuất kích thước dạng 800x300x200 hoặc 80x30x20
  const multiMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*[x*×,]\s*(\d+(?:[.,]\d+)?)(?:\s*[x*×,]\s*(\d+(?:[.,]\d+)?))?/);
  if (multiMatch) {
    if (!length) length = parseVal(multiMatch[1]);
    if (!depth) depth = parseVal(multiMatch[2]);
    if (multiMatch[3] && !height) height = parseVal(multiMatch[3]);
  }

  // Nhận diện vật liệu & hoàn thiện bề mặt
  const material = /inox/i.test(lower)
    ? "Inox 304 không gỉ"
    : /nhôm/i.test(lower)
      ? "Nhôm 6061 / Nhôm định hình"
      : /gỗ/i.test(lower)
        ? "Khung thép hộp kết hợp Gỗ tấm"
        : "Thép hộp mạ kẽm & Thép tấm";

  const finish = /sơn/i.test(lower) || /đen/i.test(lower)
    ? "Sơn tĩnh điện đen mờ cao cấp"
    : /inox/i.test(lower)
      ? "Đánh bóng kim loại Hairline"
      : /anod/i.test(lower)
        ? "Anodized mạ màu"
        : "Sơn tĩnh điện chống rỉ";

  // CASE 1: SÀO PHƠI ĐỒ / GIÁ TREO QUẦN ÁO (Đứng trên sàn)
  if (/sào|phơi|quần áo/i.test(lower)) {
    const W = length || 1500;
    const D = depth || 450;
    const H = height || 1600;
    const t = 30;
    return {
      title: "Sào phơi đồ Inox thông minh",
      material,
      finish,
      parts: [
        { name: "Chân đế tiếp sàn trái", x: 40, y: 0, z: 0, w: t, h: t, d: D },
        { name: "Chân đế tiếp sàn phải", x: W - 40 - t, y: 0, z: 0, w: t, h: t, d: D },
        { name: "Cột đứng chính trái", x: 40, y: t, z: Math.round((D - t) / 2), w: t, h: H - t * 2, d: t },
        { name: "Cột đứng chính phải", x: W - 40 - t, y: t, z: Math.round((D - t) / 2), w: t, h: H - t * 2, d: t },
        { name: "Thanh xà treo trên cùng", x: 0, y: H - t, z: Math.round((D - t) / 2), w: W, h: t, d: t },
        { name: "Thanh giằng chân chống rung", x: 40 + t, y: t + 20, z: Math.round((D - t) / 2), w: W - (40 + t) * 2, h: 25, d: 25 },
      ],
      holes: [],
      notes: [
        "Ống Inox 304 phi 25-32 mm dày 1.2 mm chống han gỉ thời tiết",
        "Chân đế bọc đệm chống trượt bám dính tốt trên sàn",
        "Tải trọng phơi an toàn tối đa 35 kg",
      ],
      assumptions: [`Kích thước tổng thể: Dài ${W}mm x Sâu chân ${D}mm x Cao ${H}mm`],
    };
  }

  // CASE 2: KỆ ĐỂ DÉP / KỆ GIÀY / KỆ SÀN NHIỀU TẦNG (Không có pát treo tường!)
  if ((/dép|giày|sàn|kho|sách|kệ.*(tầng|để đồ|bếp|chén)/i.test(lower) || !/treo tường/i.test(lower)) && !/mặt bích|bàn/i.test(lower)) {
    const W = length || 750;
    const D = depth || 280;
    const H = height || tiers * 240 + 60;
    const leg = 25;
    const parts: CadPart[] = [
      { name: "Chân trụ trước trái", x: 0, y: 0, z: 0, w: leg, h: H, d: leg },
      { name: "Chân trụ trước phải", x: W - leg, y: 0, z: 0, w: leg, h: H, d: leg },
      { name: "Chân trụ sau trái", x: 0, y: 0, z: D - leg, w: leg, h: H, d: leg },
      { name: "Chân trụ sau phải", x: W - leg, y: 0, z: D - leg, w: leg, h: H, d: leg },
    ];

    for (let i = 0; i < tiers; i++) {
      const yPos = Math.round(50 + i * ((H - 80) / Math.max(1, tiers - 1)));
      parts.push({
        name: `Đợt để tầng ${i + 1}`,
        x: leg,
        y: yPos,
        z: 0,
        w: W - leg * 2,
        h: 15,
        d: D,
      });
    }

    return {
      title: /dép|giày/i.test(lower) ? `Kệ để dép ${tiers} tầng đứng sàn` : `Kệ đa năng ${tiers} tầng`,
      material,
      finish,
      parts,
      holes: [],
      notes: [
        "Khung thép hộp 25x25 hàn liền khối chắc chắn",
        "Mỗi đợt kệ dạng nan/tấm chịu lực 20kg/tầng",
        "Chân đế bọc đệm cao su bảo vệ nền nhà",
      ],
      assumptions: [`Kích thước: Dài ${W}mm x Sâu ${D}mm x Cao ${H}mm (${tiers} tầng)`],
    };
  }

  // CASE 3: MẶT BÍCH TRÒN / ĐĨA CNC / TẤM ĐỊNH TÂM
  if (/mặt bích|flange|đĩa|tấm tròn/i.test(lower)) {
    const dia = Math.min(length || 250, 450);
    const thick = depth || 16;
    return {
      title: "Mặt bích cơ khí CNC",
      material,
      finish,
      parts: [
        { name: "Thân mặt bích chính", x: 0, y: 0, z: 0, w: dia, h: thick, d: dia },
        { name: "Gờ định tâm", x: dia * 0.25, y: thick, z: dia * 0.25, w: dia * 0.5, h: 10, d: dia * 0.5 },
      ],
      holes: [
        { x: dia / 2, y: thick / 2, z: dia / 2, diameter: Math.round(dia * 0.3), axis: "y" },
        { x: dia * 0.15, y: thick / 2, z: dia / 2, diameter: 10, axis: "y" },
        { x: dia * 0.85, y: thick / 2, z: dia / 2, diameter: 10, axis: "y" },
        { x: dia / 2, y: thick / 2, z: dia * 0.15, diameter: 10, axis: "y" },
        { x: dia / 2, y: thick / 2, z: dia * 0.85, diameter: 10, axis: "y" },
      ],
      notes: ["Dung sai cơ khí gia công ±0.05 mm", "Vát mép C1 tất cả các cạnh sắc"],
      assumptions: [`Đường kính ngoài ${dia} mm, 4 lỗ bulong M10 đối xứng`],
    };
  }

  // CASE 4: BÀN LÀM VIỆC / BÀN TRÀ / BÀN ĂN
  if (/bàn/i.test(lower)) {
    const tableW = length >= 600 ? length : 1200;
    const tableD = depth > 350 ? depth : 600;
    const tableH = height > 400 ? height : 750;
    return {
      title: "Bàn khung thép mặt gỗ CNC",
      material: "Khung thép hộp 40x40 & Mặt gỗ sồi 25mm",
      finish: "Sơn tĩnh điện đen mờ, gỗ lau dầu bóng",
      parts: [
        { name: "Mặt bàn gỗ sồi", x: 0, y: tableH - 25, z: 0, w: tableW, h: 25, d: tableD },
        { name: "Chân thép trái trước", x: 30, y: 0, z: 30, w: 40, h: tableH - 25, d: 40 },
        { name: "Chân thép phải trước", x: tableW - 70, y: 0, z: 30, w: 40, h: tableH - 25, d: 40 },
        { name: "Chân thép trái sau", x: 30, y: 0, z: tableD - 70, w: 40, h: tableH - 25, d: 40 },
        { name: "Chân thép phải sau", x: tableW - 70, y: 0, z: tableD - 70, w: 40, h: tableH - 25, d: 40 },
        { name: "Giằng ngang trên", x: 30, y: tableH - 65, z: 30, w: tableW - 60, h: 40, d: 40 },
      ],
      holes: [],
      notes: ["Hàn TIG liên kết kín, mài phẳng mối hàn", "Gia công mặt gỗ xẻ CNC bo cạnh"],
      assumptions: [`Kích thước bàn tiêu chuẩn: Dài ${tableW} x Sâu ${tableD} x Cao ${tableH} mm`],
    };
  }

  // CASE 5: KỆ TREO TƯỜNG (Chỉ khi khách ghi rõ treo tường)
  const shelfL = length || 1000;
  const shelfD = depth || 220;
  const shelfH = height > 150 ? height : 280;
  const t = 20;
  return {
    title: "Kệ treo tường cơ khí",
    material,
    finish,
    parts: [
      { name: "Mặt đợt kệ chính", x: 0, y: 0, z: 0, w: shelfL, h: t, d: shelfD },
      { name: "Thanh giằng lưng", x: 0, y: t, z: shelfD - t, w: shelfL, h: t, d: t },
      { name: "Pát treo tường trái", x: t * 2, y: t, z: shelfD - 4, w: 35, h: shelfH - t, d: 4 },
      { name: "Pát treo tường phải", x: shelfL - t * 2 - 35, y: t, z: shelfD - 4, w: 35, h: shelfH - t, d: 4 },
      { name: "Ke góc gia cường trái", x: t * 2, y: t, z: t, w: 8, h: 45, d: shelfD - t * 2 },
      { name: "Ke góc gia cường phải", x: shelfL - t * 2 - 8, y: t, z: t, w: 8, h: 45, d: shelfD - t * 2 },
    ],
    holes: [
      { x: t * 2 + 17, y: shelfH - 35, z: shelfD - 2, diameter: 8, axis: "z" },
      { x: shelfL - t * 2 - 18, y: shelfH - 35, z: shelfD - 2, diameter: 8, axis: "z" },
    ],
    notes: [
      "Khoan 2 lỗ fi 8mm bắt vít nở treo tường chịu lực",
      "Gia công hàn liên kết khung chắc chắn, mài phẳng mối nối",
      "Sơn tĩnh điện chống gỉ cao cấp",
    ],
    assumptions: [
      `Kích thước tổng thể: Dài ${shelfL}mm x Sâu ${shelfD}mm x Cao ${shelfH}mm`,
      "Kết cấu pát treo chịu lực thiết kế cho tải trọng an toàn 25kg",
    ],
  };
}

/**
 * Trí tuệ nhân tạo Gemini phân tích mô tả khách hàng -> Lập mô hình CAD 3D dạng khối hộp
 */
async function generateCadSpec(userDescription: string): Promise<{ spec: CadSpec; by: string }> {
  const key = geminiKey();
  const sys = `Bạn là kỹ sư cơ khí thiết kế bản vẽ CAD cho xưởng gia công CNC kim loại và mộc.
Đọc kỹ mô tả tiếng Việt của khách hàng, phân loại chính xác sản phẩm:
- Kệ để dép / Kệ để giày / Tủ giày / Kệ sàn nhiều tầng: Là kệ ĐỨNG TRÊN SÀN gồm các chân trụ đứng (chạm đất y=0) và các tầng đợt để đồ. TUYỆT ĐỐI KHÔNG vẽ pát treo tường, KHÔNG khoan lỗ vít tường!
- Sào phơi đồ / Giá treo quần áo: Là khung ĐỨNG TRÊN SÀN gồm 2 chân đế ngang tiếp sàn, 2 cột trụ đứng, xà treo trên cùng và giằng chống rung. TUYỆT ĐỐI KHÔNG vẽ pát treo tường!
- Bàn làm việc / Bàn trà: Mặt bàn, 4 chân trụ và giằng khung.
- Xe đẩy hàng / Kệ có bánh xe: Khung, bánh xe, các khay chứa.
- Tủ / Vỏ tủ điện: Khung vỏ hộp, các vách và đợt ngăn.
- Mặt bích / Đĩa tròn CNC: Đĩa tròn, gờ định tâm, các lỗ bulong đối xứng (axis="y").
- Bản mã / Ke góc: Tấm kim loại phẳng cắt CNC và lỗ bulong liên kết.
- Kệ treo tường: Chỉ khi mô tả có chữ "treo tường", mới có đợt kệ phẳng, pát gắn tường phía sau và lỗ bắt vít (axis="z").

Hệ trục tọa độ: x (dài, 0->W), y (cao, 0->H), z (sâu, 0->D; z=0 là mặt trước). Đơn vị mm.
BẮT BUỘC chỉ trả về đúng cấu trúc JSON:
{
  "title": "Tên kỹ thuật sản phẩm (vd: Kệ để dép 3 tầng đứng sàn)",
  "material": "Vật liệu (vd: Thép hộp 25x25 & Sơn tĩnh điện)",
  "finish": "Xử lý bề mặt (vd: Sơn tĩnh điện đen mờ)",
  "parts": [
    { "name": "Tên chi tiết", "x": 0, "y": 0, "z": 0, "w": 750, "h": 25, "d": 280 }
  ],
  "holes": [
    { "x": 50, "y": 10, "z": 190, "diameter": 8, "axis": "z" }
  ],
  "notes": ["Ghi chú gia công quan trọng"],
  "assumptions": ["Giả định kích thước"]
}`;

  if (key) {
    for (const model of GEMINI_TEXT_MODELS) {
      try {
        const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${sys}\n\nYêu cầu khách hàng: "${userDescription}"` }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.warn(`[CAD SPEC] Model ${model} returned ${res.status}:`, errText.slice(0, 120));
          continue;
        }

        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;
        const parsed = JSON.parse(text);
        const spec = sanitizeSpec(parsed);
        if (spec && spec.parts.length > 0) return { spec, by: `Gemini (${model})` };
      } catch (err) {
        console.warn(`[CAD SPEC] Model ${model} error:`, err);
      }
    }
  }

  // Fallback 1: Thử text.pollinations.ai (sử dụng model openai-fast miễn phí)
  try {
    const prompt = `${sys}\n\nChỉ trả về JSON thuần túy, không có markdown hay giải thích. Thiết kế CAD cho yêu cầu: "${userDescription}"`;
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai-fast&json=true`, {
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const text = await res.text();
      const cleaned = text.replace(/^```json\s*|^```\s*|```$/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const spec = sanitizeSpec(parsed);
      if (spec && spec.parts.length > 0) return { spec, by: "Pollinations AI" };
    }
  } catch {
    // Tiếp tục fallback cơ khí
  }

  // Fallback 2: Parametric rule-based engine
  return { spec: buildParametricCadSpec(userDescription), by: "Hệ thống tham số cơ khí CNC" };
}

/**
 * Xử lý tạo bản vẽ CAD kỹ thuật 2D (xuất cả SVG xem trước và DXF tải về)
 */
async function generateCadBlueprint(userDescription: string): Promise<AiSketchResult> {
  const desc = userDescription.trim().slice(0, 1500);
  const { spec, by } = await generateCadSpec(desc);

  const dateStr = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const codeStr = `CAD-${randomUUID().slice(0, 6).toUpperCase()}`;

  const svgContent = renderSvg(spec, { date: dateStr, code: codeStr });
  const dxfContent = renderDxf(spec);

  const dir = path.join(process.cwd(), "public", "ai-previews");
  await mkdir(dir, { recursive: true });

  const fileId = randomUUID();
  const svgFileName = `cad-${fileId}.svg`;
  const dxfFileName = `cad-${fileId}.dxf`;

  await writeFile(path.join(dir, svgFileName), svgContent, "utf8");
  await writeFile(path.join(dir, dxfFileName), dxfContent, "utf8");

  const { W, H, D } = bounds(spec);

  return {
    success: true,
    imageUrl: `/ai-previews/${svgFileName}`,
    dxfUrl: `/ai-previews/${dxfFileName}`,
    isCadDrawing: true,
    cadSpec: spec,
    provider: `Bản vẽ kỹ thuật CAD 2D · Thiết kế bởi ${by}`,
    usedPrompt: `${spec.title} (${Math.round(W)}×${Math.round(D)}×${Math.round(H)} mm) - ${spec.parts.length} chi tiết gia công`,
    message: "Đã phác thảo bản vẽ kỹ thuật CAD 2D và tạo file AutoCAD (.dxf) thành công!",
  };
}

// ---------------------------------------------------------------------------
// 2. TẠO ẢNH PHỐI CẢNH 3D RENDER (DÀNH CHO CHẾ ĐỘ RENDER 3D)
// ---------------------------------------------------------------------------

const PHRASE_DICTIONARY: [RegExp, string][] = [
  [/kệ để dép|kệ dép|tủ giày|kệ để giày/gi, "freestanding multi-tier metal shoe rack standing on floor, no wall mounts"],
  [/sào phơi đồ|sào phơi|giá phơi đồ|cây phơi đồ|giá treo quần áo/gi, "freestanding stainless steel clothes drying rack with hanging rail and sturdy base feet"],
  [/kệ treo tường/gi, "wall-mounted floating shelf fixed directly to a flat wall with concealed brackets, no legs, not touching the floor"],
  [/kệ để sàn|kệ đứng|kệ nhiều tầng/gi, "freestanding metal floor storage rack with leveling feet"],
  [/bàn làm việc|bàn học/gi, "modern minimalist office work desk with welded steel legs and wood top"],
  [/bàn trà|bàn cafe/gi, "coffee table with metal frame"],
  [/bàn/gi, "table with steel frame"],
  [/xe đẩy hàng|xe đẩy/gi, "industrial utility cart trolley with casters and push handle"],
  [/hộp kỹ thuật|vỏ tủ điện/gi, "sheet metal electrical enclosure cabinet box"],
  [/(màu )?(sơn )?(màu )?đen (sơn )?tĩnh điện|sơn tĩnh điện (màu )?đen/gi, "matte black powder-coated steel finish"],
  [/sơn tĩnh điện/gi, "powder-coated finish"],
  [/khung thép hộp|khung sắt hộp/gi, "square steel tube frame with clean welds"],
  [/khung thép|khung sắt/gi, "welded steel frame"],
  [/gỗ sồi/gi, "solid oak wood"],
  [/mặt bích/gi, "circular mechanical flange with bolt-hole pattern and center bore"],
  [/bản mã|ke góc/gi, "laser-cut steel gusset plate bracket"],
  [/nhôm/gi, "brushed 6061 aluminum"],
  [/inox/gi, "brushed 304 stainless steel"],
  [/mica|acrylic/gi, "clear acrylic with polished edges"],
  [/cắt laser/gi, "precision laser-cut"],
  [/dài khoảng|dài/gi, "length about"],
  [/rộng/gi, "width"],
  [/cao/gi, "height"],
  [/mét/gi, "meter"],
];

function dictionaryPrompt(raw: string) {
  let text = raw.trim();
  for (const [re, en] of PHRASE_DICTIONARY) text = text.replace(re, en);
  return `Photorealistic studio product photograph of ${text}. Only the product, no decorations, no objects placed on it, no people. Neutral light-gray seamless background, soft diffused studio lighting, accurate proportions, sharp focus, realistic metal and material texture, 3/4 front view.`;
}

const ENGINEER_INSTRUCTION_3D = `You are a senior industrial designer writing prompts for a text-to-image model.
The customer of a CNC/metal fabrication workshop describes a product in Vietnamese.
Write ONE English image prompt (60-110 words) that makes the image match the request EXACTLY:
- State the object type first, then its exact dimensions (convert to mm and describe proportions, e.g. "1000 mm long, about 4x longer than deep").
- Exact materials and finish (e.g. matte black powder-coated steel, brushed aluminum, solid oak).
- Mounting/orientation (wall-mounted floating vs freestanding) and construction details (brackets, welds, bolts, thickness).
- If the customer did not specify something, choose the simplest, most manufacturable CNC design.
- Show ONLY the product: empty, no decorative objects, no books, no plants, no people, no text, no logo.
- Studio product photo: neutral light-gray seamless background, soft diffused lighting, 3/4 view, sharp focus, photorealistic.
Output ONLY the prompt text, no quotes, no markdown.`;

async function engineerPrompt3D(raw: string): Promise<{ prompt: string; by: string }> {
  const key = geminiKey();
  if (key) {
    for (const model of GEMINI_TEXT_MODELS) {
      try {
        const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: ENGINEER_INSTRUCTION_3D }] },
            contents: [{ role: "user", parts: [{ text: raw }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } },
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) continue;
        const json = await res.json();
        const text: string | undefined = json.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("")
          .trim();
        if (text && text.length > 30) return { prompt: text.replace(/^["'`]+|["'`]+$/g, ""), by: model };
      } catch {
        // thử model kế tiếp
      }
    }
  }
  return { prompt: dictionaryPrompt(raw), by: "dictionary" };
}

async function generateWithGeminiImage(prompt: string, key: string): Promise<{ buffer: Buffer; model: string }> {
  let lastError = "";
  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:3" } },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        lastError = `${model} ${res.status}`;
        if (res.status === 429) break;
        continue;
      }
      const json = await res.json();
      const parts: { inlineData?: { data?: string } }[] = json.candidates?.[0]?.content?.parts ?? [];
      const b64 = parts.find((p) => p.inlineData?.data)?.inlineData?.data;
      if (b64) return { buffer: Buffer.from(b64, "base64"), model };
      lastError = `${model}: no image`;
    } catch (e) {
      lastError = `${model}: ${e instanceof Error ? e.message : e}`;
    }
  }
  throw new Error(`Gemini Image unavailable (${lastError})`);
}

async function generateWithOpenAi(prompt: string, key: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1536x1024", quality: "high", n: 1 }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI: no image");
  return Buffer.from(b64, "base64");
}

async function generateWithHuggingFace(prompt: string, token: string): Promise<Buffer> {
  const res = await fetch(
    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "image/jpeg" },
      body: JSON.stringify({ inputs: prompt, parameters: { width: 1024, height: 768 } }),
      signal: AbortSignal.timeout(60000),
    }
  );
  if (!res.ok) throw new Error(`HuggingFace ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function generateWithFallback(prompt: string): Promise<Buffer> {
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&seed=${seed}&nologo=true&enhance=false`;
  const res = await fetch(url, { headers: { Accept: "image/*" }, signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`Fallback ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// 3. SERVER ACTION ĐIỀU PHỐI (CAD 2D hoặc PHỐI CẢNH 3D)
// ---------------------------------------------------------------------------

export async function generateAiProductSketch(
  userDescription: string,
  style: AiSketchStyle = "render3d"
): Promise<AiSketchResult> {
  const desc = userDescription.trim().slice(0, 1500);
  if (desc.length < 5) {
    return { success: false, message: "Vui lòng nhập mô tả sản phẩm (tối thiểu 5 ký tự) trước khi tạo demo." };
  }

  // 1. Nếu khách chọn BẢN VẼ CAD 2D -> Dựng bản vẽ kỹ thuật cơ khí thật + Xuất file AutoCAD DXF
  if (style === "blueprint") {
    try {
      return await generateCadBlueprint(desc);
    } catch (err) {
      console.error("CAD Blueprint generation error:", err);
      return {
        success: false,
        message: "Không thể dựng bản vẽ CAD lúc này. Vui lòng kiểm tra lại mô tả.",
      };
    }
  }

  // 2. Nếu khách chọn PHỐI CẢNH 3D -> Tạo tối thiểu 3 bản từ các góc nhìn khác nhau
  try {
    const dir = path.join(process.cwd(), "public", "ai-previews");
    await mkdir(dir, { recursive: true });

    // Khởi tạo tác vụ song song: 1) Lập mô hình CAD 3D và 2) Kỹ thuật tạo prompt ảnh
    const [specRes, promptRes] = await Promise.allSettled([
      generateCadSpec(desc),
      engineerPrompt3D(desc),
    ]);

    const spec = specRes.status === "fulfilled" ? specRes.value.spec : buildParametricCadSpec(desc);
    const prompt = promptRes.status === "fulfilled" ? promptRes.value.prompt : dictionaryPrompt(desc);

    const images: AiSketchImage[] = [];
    const uuid = randomUUID();

    // 1. Thử tạo 1 ảnh Photorealistic Render nếu API khả dụng
    let photoBuffer: Buffer | null = null;
    const key = geminiKey();
    if (key) {
      try {
        const r = await generateWithGeminiImage(prompt, key);
        photoBuffer = r.buffer;
      } catch { }
    }
    if (!photoBuffer && process.env.OPENAI_API_KEY) {
      try {
        photoBuffer = await generateWithOpenAi(prompt, process.env.OPENAI_API_KEY);
      } catch { }
    }
    if (!photoBuffer) {
      try {
        photoBuffer = await generateWithFallback(prompt);
      } catch { }
    }

    if (photoBuffer && photoBuffer.length > 1000) {
      const photoName = `sketch-${uuid}-photo.jpg`;
      await writeFile(path.join(dir, photoName), photoBuffer);
      images.push({
        url: `/ai-previews/${photoName}`,
        label: "Phối cảnh AI Studio",
        sub: "Ảnh render mô phỏng thực tế",
        angle: "photo",
        type: "photo",
      });
    }

    // 2. Sinh 3 góc nhìn 3D không gian cơ khí chuẩn xác theo kích thước thật
    const angles: { angle: "perspective" | "front" | "top"; label: string; sub: string }[] = [
      {
        angle: "perspective",
        label: "Góc nghiêng 3/4",
        sub: "Phối cảnh tổng thể và chiều sâu 3D",
      },
      {
        angle: "front",
        label: "Góc chính diện",
        sub: "Mặt đứng và tỉ lệ cân đối",
      },
      {
        angle: "top",
        label: "Góc trên cao",
        sub: "Mặt đợt và khớp liên kết",
      },
    ];

    for (const a of angles) {
      const svg = render3dViewSvg(spec, a.angle);
      const svgName = `sketch-${uuid}-${a.angle}.svg`;
      await writeFile(path.join(dir, svgName), svg, "utf8");
      images.push({
        url: `/ai-previews/${svgName}`,
        label: a.label,
        sub: a.sub,
        angle: a.angle,
        type: "3d",
      });
    }

    const primaryImage = images[0]?.url || "";

    return {
      success: true,
      imageUrl: primaryImage,
      images,
      isCadDrawing: false,
      cadSpec: spec,
      provider: "AI 3D Multi-Angle Studio (Tối thiểu 3 góc nhìn)",
      usedPrompt: prompt,
      message: `Đã tạo thành công ${images.length} góc nhìn 3D khác nhau!`,
    };
  } catch (error) {
    console.error("Generate AI 3D sketch error:", error);
    return { success: false, message: "Không thể tạo ảnh phối cảnh lúc này. Vui lòng thử lại sau." };
  }
}

// ---------------------------------------------------------------------------
// 3. THIẾT KẾ THEO THAM SỐ TEMPLATE GỐC (PARAMETRIC DESIGN ENGINE)
// Khắc phục triệt để lỗi AI tự bịa bản vẽ (hallucination) bằng cách khóa bối cảnh hình học gốc
// ---------------------------------------------------------------------------

export type UserParametricInputs = {
  length: number;    // Chiều Dài (mm)
  width: number;     // Chiều Rộng / Sâu (mm)
  height: number;    // Chiều Cao (mm)
  thickness: number; // Độ Dày (mm)
  notes?: string;    // Ghi chú biến tấu (VD: khoét thêm lỗ dây điện)
};

export type ParametricDesignResult = {
  success: boolean;
  cadSpec?: CadSpec;
  svgUrl?: string;
  dxfUrl?: string;
  modifiedParams?: Record<string, any>;
  message?: string;
  provider?: string;
};

/**
 * Thuật toán tính toán cơ học hình học chuẩn xác (Deterministic Geometric Engine)
 * Đảm bảo 100% kích thước các chi tiết co giãn đúng tỷ lệ kể cả khi API mạng gián đoạn
 */
function calculateParametricGeometry(
  template: any,
  inputs: UserParametricInputs,
  productTitle: string
): CadSpec {
  const baseDim = template?.baseDimensions || {
    length: 800,
    width: 300,
    height: 200,
    thickness: 2,
  };

  const L0 = Math.max(1, Number(baseDim.length) || 800);
  const W0 = Math.max(1, Number(baseDim.width) || 300);
  const H0 = Math.max(1, Number(baseDim.height) || 200);
  const T0 = Math.max(0.5, Number(baseDim.thickness) || 2);

  const L = Math.max(10, Math.round(inputs.length || L0));
  const W = Math.max(10, Math.round(inputs.width || W0));
  const H = Math.max(10, Math.round(inputs.height || H0));
  const T = Math.max(0.5, Math.round((inputs.thickness || T0) * 10) / 10);

  const rawParts: any[] = Array.isArray(template?.parts) && template.parts.length > 0
    ? template.parts
    : [
      { name: "Mặt đáy đỡ đồ", x: 0, y: 0, z: 0, w: L0, h: T0, d: W0 },
      { name: "Thành chặn lưng", x: 0, y: T0, z: W0 - T0, w: L0, h: H0 - T0, d: T0 },
      { name: "Pát gân hồi trái", x: 0, y: T0, z: 0, w: T0, h: H0 - T0, d: W0 - T0 },
      { name: "Pát gân hồi phải", x: L0 - T0, y: T0, z: 0, w: T0, h: H0 - T0, d: W0 - T0 },
    ];

  const scaledParts: CadPart[] = rawParts.map((p) => {
    // Co giãn vị trí theo tỷ lệ không gian
    const xRatio = p.x / L0;
    const yRatio = p.y / H0;
    const zRatio = p.z / W0;

    let w = p.w;
    let h = p.h;
    let d = p.d;

    // Giữ nguyên hoặc tỉ lệ theo độ dày tấm kim loại
    if (Math.abs(p.w - T0) < 0.1) w = T;
    else w = Math.round((p.w / L0) * L);

    if (Math.abs(p.h - T0) < 0.1) h = T;
    else h = Math.round((p.h / H0) * H);

    if (Math.abs(p.d - T0) < 0.1) d = T;
    else d = Math.round((p.d / W0) * W);

    let x = Math.round(xRatio * L);
    let y = Math.round(yRatio * H);
    let z = Math.round(zRatio * W);

    // Ghim mép phải vào thành khung nếu ở mép ngoài
    if (p.x + p.w >= L0 - 1) {
      x = Math.max(0, L - w);
    }
    if (p.z + p.d >= W0 - 1) {
      z = Math.max(0, W - d);
    }
    if (p.y + p.h >= H0 - 1) {
      y = Math.max(0, H - h);
    }

    return {
      name: String(p.name || "Chi tiết"),
      x,
      y,
      z,
      w: Math.max(1, w),
      h: Math.max(1, h),
      d: Math.max(1, d),
      shape: p.shape,
    };
  });

  const holes: CadHole[] = [];
  if (Array.isArray(template?.holes)) {
    for (const h of template.holes) {
      holes.push({
        x: Math.round((h.x / L0) * L),
        y: Math.round((h.y / H0) * H),
        z: Math.round((h.z / W0) * W),
        diameter: Number(h.diameter) || 8,
        axis: h.axis === "x" || h.axis === "y" || h.axis === "z" ? h.axis : "z",
      });
    }
  }

  // Xử lý biến tấu lỗ khoét nếu khách có ghi chú
  if (inputs.notes && /lỗ|dây điện|khoét/i.test(inputs.notes)) {
    const diaMatch = inputs.notes.match(/(\d+)\s*(?:mm|ly|cm)/i);
    let dia = 25;
    if (diaMatch) {
      const val = parseInt(diaMatch[1], 10);
      dia = inputs.notes.includes("cm") ? val * 10 : val;
    }
    holes.push({
      x: Math.round(L / 2),
      y: Math.round(H / 2),
      z: Math.round(W),
      diameter: dia,
      axis: "z",
    });
  }

  const notes = Array.isArray(template?.notes) ? [...template.notes] : [];
  if (inputs.notes?.trim()) {
    notes.push(`Biến tấu theo yêu cầu khách: ${inputs.notes.trim()}`);
  }

  return {
    title: `${productTitle} (Theo thông số L=${L} x W=${W} x H=${H} x T=${T} mm)`,
    material: template?.material || "Thép tấm cán nguội SS400 sơn tĩnh điện",
    finish: template?.finish || "Sơn tĩnh điện cao cấp",
    parts: scaledParts,
    holes,
    notes,
    assumptions: [
      `Kích thước điều chỉnh: Dài ${L}mm × Rộng ${W}mm × Cao ${H}mm × Dày ${T}mm`,
    ],
  };
}

/**
 * Server Action: Thiết kế theo tham số template gốc (Parametric Design)
 * 1. Đọc bối cảnh kỹ thuật baseAiContext & cadTemplate từ DB
 * 2. Gọi AI Structured Output (hoặc Deterministic Engine) để co giãn chính xác 100%
 * 3. Xuất file 2D SVG và AutoCAD .DXF hoàn chỉnh
 */
export async function generateParametricDesign(
  productId: string,
  userInputs: UserParametricInputs
): Promise<ParametricDesignResult> {
  try {
    // 1. Truy vấn database lấy thông tin sản phẩm gốc
    let product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      product = (await getProductById(productId)) as any;
    }

    if (!product) {
      return {
        success: false,
        message: "Không tìm thấy sản phẩm trong hệ thống.",
      };
    }

    let cadTemplate = product.cadTemplate as any;
    if (typeof cadTemplate === "string") {
      try {
        cadTemplate = JSON.parse(cadTemplate);
      } catch { }
    }
    let baseAiContext: string | null | undefined = product.baseAiContext;

    // Fallback: nếu database chưa có cadTemplate thì tìm trong INITIAL_PRODUCTS
    if (!cadTemplate || !Array.isArray(cadTemplate.parts) || cadTemplate.parts.length === 0) {
      const matchInitial = INITIAL_PRODUCTS.find(
        (p) => p.name === product.name || (product.name && (p.name.includes(product.name) || product.name.includes(p.name)))
      );
      if (matchInitial?.cadTemplate) {
        cadTemplate = matchInitial.cadTemplate;
        baseAiContext = baseAiContext || matchInitial.baseAiContext || null;
      }
    }

    if (!cadTemplate) {
      if (/pát|giá đỡ|tam giác|bracket/i.test(product.name)) {
        cadTemplate = {
          title: product.name,
          baseDimensions: { length: 300, width: 50, height: 200, thickness: 4 },
          material: product.material || "Thép tấm SS400 dày 4.0mm",
          finish: "Sơn tĩnh điện đen mờ cao cấp",
          parts: [
            { name: "Bản thép ngang đỡ kệ", x: 0, y: 196, z: 0, w: 300, h: 4, d: 50 },
            { name: "Bản thép dọc áp tường", x: 0, y: 0, z: 0, w: 4, h: 200, d: 50 },
            { name: "Gân tam giác tăng cứng", x: 4, y: 0, z: 23, w: 296, h: 196, d: 4, shape: "triangle" },
          ],
          holes: [
            { x: 4, y: 170, z: 25, diameter: 8, axis: "x" },
            { x: 4, y: 30, z: 25, diameter: 8, axis: "x" },
            { x: 50, y: 200, z: 25, diameter: 6, axis: "y" },
            { x: 270, y: 200, z: 25, diameter: 6, axis: "y" },
            { x: 75, y: 130, z: 25, diameter: 45, axis: "z" },
            { x: 150, y: 85, z: 25, diameter: 30, axis: "z" },
            { x: 220, y: 45, z: 25, diameter: 18, axis: "z" },
          ],
          notes: ["Cắt laser fiber ±0.03mm", "Hàn TIG ngấu phẳng", "3 lỗ thoát trọng lượng tam giác"],
        };
      } else {
        cadTemplate = {
          title: product.name,
          baseDimensions: { length: 800, width: 300, height: 200, thickness: 2 },
          material: product.material || "Thép tấm cán nguội SS400",
          finish: "Sơn tĩnh điện chất lượng cao",
          parts: [
            { name: "Mặt đáy đỡ đồ", x: 0, y: 0, z: 0, w: 800, h: 2, d: 300 },
            { name: "Thành chặn lưng", x: 0, y: 2, z: 298, w: 800, h: 198, d: 2 },
            { name: "Pát gân hồi trái", x: 0, y: 2, z: 0, w: 2, h: 198, d: 298 },
            { name: "Pát gân hồi phải", x: 798, y: 2, z: 0, w: 2, h: 198, d: 298 },
          ],
          holes: [],
          notes: [],
        };
      }
    }

    if (!baseAiContext) {
      baseAiContext = "Bản vẽ kỹ thuật cơ khí CNC định hình. Gia công cắt laser & chấn gấp CNC chính xác.";
    }

    // 2. Viết System Prompt ép buộc AI hoạt động như máy tính toán CAD toán học
    const systemPrompt = `Bạn là một công cụ tính toán tham số kỹ thuật. Bối cảnh gốc: ${baseAiContext}. Template cấu trúc gốc: ${JSON.stringify(
      cadTemplate
    )}. Yêu cầu tùy chỉnh kích thước của khách: ${JSON.stringify(
      userInputs
    )}. Nhiệm vụ: Không được thay đổi hình học cốt lõi. Hãy tính toán lại tỷ lệ và trả về CHÍNH XÁC một đối tượng JSON chứa kích thước mới của các bộ phận (parts) theo đúng định dạng template gốc. Không trả lời bằng văn bản.`;

    let spec: CadSpec | null = null;
    let providerName = "Động cơ tham số toán học CAD (Chống sai lệch 100%)";

    const key = geminiKey();
    const openAiKey = process.env.OPENAI_API_KEY?.trim();

    // 3. Thực thi Structured Output với LLM
    if (key) {
      for (const model of GEMINI_TEXT_MODELS) {
        try {
          const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `${systemPrompt}\n\nĐịnh dạng trả về: JSON object thuần túy khớp schema { title: string, material: string, finish: string, parts: [{ name, x, y, z, w, h, d }], holes: [{ x, y, z, diameter, axis }], notes: string[] }`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
            signal: AbortSignal.timeout(12000),
          });

          if (res.ok) {
            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const parsed = JSON.parse(rawText);
              spec = sanitizeSpec(parsed);
              if (spec && spec.parts.length > 0) {
                providerName = `AI Parametric Engine · Gemini (${model})`;
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`[Parametric AI] Gemini ${model} error:`, e);
        }
      }
    } else if (openAiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Hãy tính toán kích thước mới theo định dạng JSON template gốc cho các thông số: ${JSON.stringify(
                  userInputs
                )}`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data.choices?.[0]?.message?.content;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            spec = sanitizeSpec(parsed);
            if (spec && spec.parts.length > 0) {
              providerName = "AI Parametric Engine · OpenAI Structured Output";
            }
          }
        }
      } catch (e) {
        console.warn("[Parametric AI] OpenAI error:", e);
      }
    }

    // 4. Fallback thuật toán tính toán tham số kỹ thuật chuẩn xác nếu API bên ngoài không phản hồi
    if (!spec || spec.parts.length === 0) {
      spec = calculateParametricGeometry(cadTemplate, userInputs, product.name);
      providerName = "Động cơ cơ học chính xác CNC (Parametric Solid Math)";
    }

    // 5. Kết xuất bản vẽ 2D SVG và AutoCAD DXF
    const dateStr = new Date().toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
    const codeStr = `CAD-${randomUUID().slice(0, 6).toUpperCase()}`;

    const svgContent = renderSvg(spec, { date: dateStr, code: codeStr });
    const dxfContent = renderDxf(spec);

    const dir = path.join(process.cwd(), "public", "ai-previews");
    await mkdir(dir, { recursive: true });

    const fileId = randomUUID();
    const svgFileName = `cad-${fileId}.svg`;
    const dxfFileName = `cad-${fileId}.dxf`;

    await writeFile(path.join(dir, svgFileName), svgContent, "utf8");
    await writeFile(path.join(dir, dxfFileName), dxfContent, "utf8");

    return {
      success: true,
      cadSpec: spec,
      svgUrl: `/ai-previews/${svgFileName}`,
      dxfUrl: `/ai-previews/${dxfFileName}`,
      modifiedParams: {
        length: userInputs.length,
        width: userInputs.width,
        height: userInputs.height,
        thickness: userInputs.thickness,
        notes: userInputs.notes || "",
      },
      provider: providerName,
      message: `Đã tính toán tham số CAD thành công theo khuôn mẫu: ${product.name}`,
    };
  } catch (error) {
    console.error("generateParametricDesign error:", error);
    return {
      success: false,
      message: "Có lỗi khi tính toán thiết kế theo tham số. Vui lòng thử lại.",
    };
  }
}

