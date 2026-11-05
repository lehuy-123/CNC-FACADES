/**
 * Bộ dựng bản vẽ kỹ thuật từ mô hình hộp (cuboid) do AI thiết kế.
 * Hệ trục: x = dài (trái → phải), y = cao (dưới → trên), z = sâu (trước → sau, z=0 là mặt trước).
 * Xuất: SVG (khổ A3 ngang, 3 hình chiếu + trục đo + bảng kê + khung tên) và DXF R12 (mở bằng AutoCAD).
 */

export type CadPart = {
  name: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  shape?: "box" | "triangle";
};
export type CadHole = { x: number; y: number; z: number; diameter: number; axis: "x" | "y" | "z" };
export type CadSpec = {
  title: string;
  material: string;
  finish: string;
  parts: CadPart[];
  holes: CadHole[];
  notes: string[];
  assumptions: string[];
};

export function isTriangularPart(p: CadPart): boolean {
  return p.shape === "triangle" || /tam giác|gusset|gân tăng cứng|gân tam giác|bracket/i.test(p.name);
}

// ---------------------------------------------------------------------------
// Chuẩn hóa dữ liệu AI trả về
// ---------------------------------------------------------------------------

function clampN(v: unknown, min: number, max: number, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

function str(v: unknown, def = "", max = 120) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : def;
}

function strList(v: unknown, limit: number) {
  return Array.isArray(v) ? v.map((s) => str(s, "", 160)).filter(Boolean).slice(0, limit) : [];
}

export function sanitizeSpec(raw: unknown): CadSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const parts: CadPart[] = [];
  for (const p of Array.isArray(r.parts) ? r.parts.slice(0, 60) : []) {
    if (!p || typeof p !== "object") continue;
    const q = p as Record<string, unknown>;
    const isTri = q.shape === "triangle" || /tam giác|gusset|gân tăng cứng|gân tam giác|bracket/i.test(String(q.name || ""));
    const part: CadPart = {
      name: str(q.name, "Chi tiết", 60),
      x: clampN(q.x, -20000, 20000, 0),
      y: clampN(q.y, -20000, 20000, 0),
      z: clampN(q.z, -20000, 20000, 0),
      w: clampN(q.w, 0, 20000, 0),
      h: clampN(q.h, 0, 20000, 0),
      d: clampN(q.d, 0, 20000, 0),
      shape: isTri ? "triangle" : "box",
    };
    if (part.w >= 0.5 && part.h >= 0.5 && part.d >= 0.5) parts.push(part);
  }
  if (parts.length === 0) return null;

  // Đưa góc nhỏ nhất về gốc tọa độ
  const minX = Math.min(...parts.map((p) => p.x));
  const minY = Math.min(...parts.map((p) => p.y));
  const minZ = Math.min(...parts.map((p) => p.z));
  for (const p of parts) {
    p.x -= minX;
    p.y -= minY;
    p.z -= minZ;
  }

  const holes: CadHole[] = [];
  for (const h of Array.isArray(r.holes) ? r.holes.slice(0, 80) : []) {
    if (!h || typeof h !== "object") continue;
    const q = h as Record<string, unknown>;
    const axis = q.axis === "x" || q.axis === "y" || q.axis === "z" ? q.axis : null;
    const diameter = clampN(q.diameter, 0, 1000, 0);
    if (!axis || diameter < 1) continue;
    holes.push({
      x: clampN(q.x, -20000, 20000, 0) - minX,
      y: clampN(q.y, -20000, 20000, 0) - minY,
      z: clampN(q.z, -20000, 20000, 0) - minZ,
      diameter,
      axis,
    });
  }

  return {
    title: str(r.title, "Sản phẩm gia công", 60),
    material: str(r.material, "Thép", 60),
    finish: str(r.finish, "—", 60),
    parts,
    holes,
    notes: strList(r.notes, 6),
    assumptions: strList(r.assumptions, 6),
  };
}

export function bounds(spec: CadSpec) {
  return {
    W: Math.max(...spec.parts.map((p) => p.x + p.w)),
    H: Math.max(...spec.parts.map((p) => p.y + p.h)),
    D: Math.max(...spec.parts.map((p) => p.z + p.d)),
  };
}

// ---------------------------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------------------------

const f = (n: number) => n.toFixed(1);
const mm = (n: number) => String(Math.round(n * 10) / 10);
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function toAscii(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7E]/g, "");
}

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

export function isWardrobeSpec(spec: CadSpec): boolean {
  if (!spec) return false;
  const rawTitle = (spec.title || "").toLowerCase();
  const normTitle = rawTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  if (
    /tủ áo|tủ quần áo|wardrobe|tủ đồ|tu ao|tu quan ao|tu do/i.test(normTitle) ||
    /tủ áo|tủ quần áo|wardrobe|tủ đồ/i.test(rawTitle)
  ) {
    return true;
  }

  const rawParts = (spec.parts || []).map((p) => p.name || "").join(" ").toLowerCase();
  const normParts = rawParts
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  return (
    (/suốt treo|thanh treo|cánh lật/i.test(rawParts) || /suot treo|thanh treo|canh lat/i.test(normParts)) &&
    (/ngăn kéo/i.test(rawParts) || /ngan keo/i.test(normParts))
  );
}

export function isStrutBracketSpec(spec: CadSpec): boolean {
  if (!spec) return false;
  const rawTitle = (spec.title || "").toLowerCase();
  const rawParts = (spec.parts || []).map((p) => p.name || "").join(" ").toLowerCase();
  const combined = `${rawTitle} ${rawParts}`;
  const norm = combined
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  if (
    /ke do|ke chu l|pat do tam giac|pat do chu l|gia do ke|thanh giang 3 lo|strut bracket/i.test(norm) ||
    /ke đỡ|ke chữ l|pát đỡ tam giác|pát đỡ chữ l|thanh giằng 3 lỗ/i.test(combined)
  ) {
    return true;
  }

  return (
    (/pát đỡ|ke góc|giá đỡ|bracket/i.test(combined) || /pat do|ke goc|gia do/i.test(norm)) &&
    (/thanh giằng|3 lỗ|tam giác|gân tăng cứng|gusset|strut/i.test(combined) ||
      (Array.isArray(spec.holes) && spec.holes.filter((h) => h.axis === "z").length >= 3))
  );
}

// ---------------------------------------------------------------------------
// TOÁN HỌC HÌNH HỌC THAM SỐ CHO KE ĐỠ CHỮ L THANH GIẰNG 3 LỖ TRÒN (RICHELIEU STYLE)
// ---------------------------------------------------------------------------

type StrutBracketGeom = {
  L: number;           // Chiều dài cánh ngang đỡ kệ (mm)
  W: number;           // Bản rộng thanh thép (mm)
  H: number;           // Chiều cao cánh đứng áp tường (mm)
  T: number;           // Độ dày bản thép (mm)
  rIn: number;         // Bán kính uốn trong góc 90° (mm)
  rOut: number;        // Bán kính uốn ngoài góc 90° (mm)
  rEnd: number;        // Bán kính bo tròn 2 đầu mút = W/2 (mm)
  xA: number;          // Tâm chân thanh giằng trên mặt trong cánh đứng (x = T)
  yA: number;          // Cao độ tâm chân thanh giằng tính từ đáy (mm)
  hBraceFromTop: number; // Khoảng cách từ mặt trên xuống tâm chân thanh giằng (mm)
  xB: number;          // Tâm đỉnh thanh giằng trên mặt dưới cánh ngang (mm)
  yB: number;          // Cao độ mặt dưới cánh ngang (y = H - T)
  lBraceFromBack: number; // Khoảng cách từ lưng tường ra tâm đỉnh thanh giằng (mm)
  bStrut: number;      // Bản rộng của thanh giằng chéo (mm)
  angleDeg: number;    // Góc nghiêng thanh giằng so với phương ngang (độ)
  axisLen: number;     // Chiều dài đường tâm thanh giằng (mm)
  ux: number;
  uy: number;
  nx: number;
  ny: number;
  strutPoly: [number, number][]; // Đa giác thanh giằng trong mặt phẳng XY
  tenonLen: number;    // Chiều dài lỗ mộng chữ nhật trên cánh ngang (mm)
  holeDia: number;     // Đường kính 3 lỗ tròn giảm trọng lượng trên thanh giằng (mm)
  holePitch: number;   // Khoảng cách tâm giữa các lỗ tròn trên thanh giằng (mm)
  strutHoles: { cx: number; cy: number; r: number }[];
  wallHoleDia: number; // Đường kính lỗ xuyên vít tường (mm)
  wallCskDia: number;  // Đường kính miệng vát côn âm vít tường (mm)
  yWallTop: number;    // Cao độ lỗ vít tường trên tính từ đáy (mm)
  yWallTopFromTop: number; // Khoảng cách lỗ vít tường trên tính từ đỉnh (mm)
  yWallBot: number;    // Cao độ lỗ vít tường dưới tính từ đáy (mm)
  shelfHoleDia: number; // Đường kính lỗ vít bắt kệ trên cánh ngang (mm)
  xShelfIn: number;    // Hoành độ lỗ vít trong trên cánh ngang (mm)
  xShelfOut: number;   // Hoành độ lỗ vít ngoài trên cánh ngang (mm)
  xShelfOutFromTip: number; // Khoảng cách lỗ vít ngoài tới mũi cánh ngang (mm)
};

function extractStrutBracketGeometry(spec: CadSpec): StrutBracketGeom {
  const { W: boundW, H: boundH, D: boundD } = bounds(spec);

  let parsedL = 0;
  let parsedW = 0;
  let parsedH = 0;
  let parsedT = 0;

  const titleMatch = (spec.title || "").match(
    /L=(\d+(?:\.\d+)?)\s*x\s*W=(\d+(?:\.\d+)?)\s*x\s*H=(\d+(?:\.\d+)?)\s*x\s*T=(\d+(?:\.\d+)?)/i
  );
  if (titleMatch) {
    parsedL = parseFloat(titleMatch[1]);
    parsedW = parseFloat(titleMatch[2]);
    parsedH = parseFloat(titleMatch[3]);
    parsedT = parseFloat(titleMatch[4]);
  } else {
    const assumpText = (spec.assumptions || []).join(" ");
    const m = assumpText.match(
      /Dài\s*(\d+(?:\.\d+)?)\s*mm.*Rộng\s*(\d+(?:\.\d+)?)\s*mm.*Cao\s*(\d+(?:\.\d+)?)\s*mm.*Dày\s*(\d+(?:\.\d+)?)\s*mm/i
    );
    if (m) {
      parsedL = parseFloat(m[1]);
      parsedW = parseFloat(m[2]);
      parsedH = parseFloat(m[3]);
      parsedT = parseFloat(m[4]);
    }
  }

  if (!parsedT) {
    const topArm = (spec.parts || []).find((p) => /ngang|đỡ kệ/i.test(p.name));
    if (topArm && topArm.h >= 2 && topArm.h <= 25) parsedT = topArm.h;
  }

  const L = Math.max(100, Math.min(1500, Math.round(parsedL || boundW || 250)));
  const W = Math.max(20, Math.min(300, Math.round(parsedW || boundD || 40)));
  const H = Math.max(100, Math.min(1500, Math.round(parsedH || boundH || 200)));
  const T = Math.max(2, Math.min(20, Math.round((parsedT || 5) * 10) / 10));

  const rIn = Math.max(3, Math.round(T * 1.2));
  const rOut = rIn + T;
  const rEnd = Math.round((W / 2) * 10) / 10;

  // Tâm chân thanh giằng trên cánh đứng & tâm đỉnh thanh giằng dưới cánh ngang
  const hBraceFromTop = Math.round(H * 0.66);
  const yA = H - hBraceFromTop; // 0.34 * H từ đáy
  const xA = T;

  const lBraceFromBack = Math.round(L * 0.68);
  const xB = lBraceFromBack;
  const yB = H - T;

  const dx = xB - xA;
  const dy = yB - yA;
  const axisLen = Math.hypot(dx, dy);
  const ux = dx / axisLen;
  const uy = dy / axisLen;
  // Pháp tuyến hướng lên-trái
  const nx = -uy;
  const ny = ux;
  const angleDeg = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) * 10) / 10;

  // Bản rộng thanh giằng chéo & nửa bản rộng
  const bStrut = Math.round(Math.max(18, Math.min(W * 0.85, Math.min(L, H) * 0.16)));
  const hs = bStrut / 2;

  // Giao điểm biên trên thanh giằng với mặt trong cánh đứng (x = T) và mặt dưới cánh ngang (y = H - T)
  const yTopWall = Math.min(H - rOut - 2, yA + hs / ux);
  const xTopShelf = Math.max(rOut + 2, xB - hs / uy);

  // Giao điểm biên dưới thanh giằng với mặt trong cánh đứng (x = T) và vát gót ở cánh ngang
  const yBotWall = Math.max(rEnd + 8, yA - hs / ux);
  const xBotFull = xB + hs / uy;
  const xBotShelf = Math.min(L - rEnd - 4, xB + (hs / uy) * 0.42);
  // Điểm gót vát (heel chamfer) trên biên dưới thanh giằng giống ảnh thực tế
  const heelBackDist = (xBotFull - xBotShelf) * 0.85;
  const xBotHeel = xBotFull - heelBackDist * ux;
  const yBotHeel = yB - heelBackDist * uy;

  const strutPoly: [number, number][] = [
    [T, yTopWall],
    [xTopShelf, yB],
    [xBotShelf, yB],
    [xBotHeel, yBotHeel],
    [T, yBotWall],
  ];

  const tenonLen = Math.round(Math.max(10, bStrut * 0.44));

  // 3 lỗ tròn bằng nhau phân bố đều dọc theo đường tâm thanh giằng
  const holeDia = Math.round(bStrut * 0.56);
  const holeR = holeDia / 2;
  const sStart = (hs * uy) / ux + holeR * 0.35;
  const sEnd = axisLen - (hs * ux) / uy - holeR * 0.25;
  const sSpan = Math.max(holeDia * 3.4, sEnd - sStart);
  const ratios = [0.21, 0.5, 0.79];
  const strutHoles = ratios.map((r) => {
    const s = sStart + r * sSpan;
    return {
      cx: xA + s * ux,
      cy: yA + s * uy,
      r: holeR,
    };
  });
  const holePitch = Math.round(0.29 * sSpan * 10) / 10;

  // 2 lỗ vít âm côn trên cánh đứng
  const wallHoleDia = Math.round(Math.max(5, Math.min(10, W * 0.16)) * 10) / 10;
  const wallCskDia = Math.round(wallHoleDia * 1.85);
  const yWallTopFromTop = Math.round(Math.max(rOut + 14, (H - yTopWall) * 0.42));
  const yWallTop = H - yWallTopFromTop;
  const yWallBot = Math.round(Math.max(rEnd * 0.9, yBotWall * 0.52));

  // 2 lỗ vít trên cánh ngang
  const shelfHoleDia = Math.round(Math.max(4.5, Math.min(9, W * 0.15)) * 10) / 10;
  const xShelfIn = Math.round(Math.max(rOut + 14, xTopShelf * 0.29));
  const xShelfOutFromTip = Math.round(Math.max(rEnd * 0.95, (L - xBotShelf) * 0.32));
  const xShelfOut = L - xShelfOutFromTip;

  return {
    L,
    W,
    H,
    T,
    rIn,
    rOut,
    rEnd,
    xA,
    yA,
    hBraceFromTop,
    xB,
    yB,
    lBraceFromBack,
    bStrut,
    angleDeg,
    axisLen,
    ux,
    uy,
    nx,
    ny,
    strutPoly,
    tenonLen,
    holeDia,
    holePitch,
    strutHoles,
    wallHoleDia,
    wallCskDia,
    yWallTop,
    yWallTopFromTop,
    yWallBot,
    shelfHoleDia,
    xShelfIn,
    xShelfOut,
    xShelfOutFromTip,
  };
}

/**
 * Dựng mô hình 3D Vector chân thực của Ke đỡ chữ L thanh giằng 3 lỗ tròn
 * (Khớp 95% góc chụp thực tế: góc uốn cong 90°, 2 đầu bo tròn bán nguyệt, 2 lỗ vít âm côn,
 * mộng chữ nhật trên cánh ngang, và thanh giằng chéo đục 3 lỗ tròn có chiều dày thành lỗ 3D)
 */
function renderStrutBracket3dElements(
  g: StrutBracketGeom,
  box: { x: number; y: number; w: number; h: number },
  options: {
    angle?: CameraAngle;
    holeBgColor?: string;
    idPrefix?: string;
    showDimensions?: boolean;
  } = {}
): string {
  const angle = options.angle || "perspective";
  const holeBg = options.holeBgColor || "#f8fafc";
  const pfx = options.idPrefix || "sb3d";

  // Phép chiếu 3D (x: 0..L sang phải-xuống, y: 0..H hướng lên, z: 0..W sang phải-lên)
  const projectRaw = (x: number, y: number, z: number): [number, number] => {
    if (angle === "front") {
      // Nhìn trực diện mặt bên thấy rõ chữ L, thanh giằng 3 lỗ và hơi nghiêng nhẹ thấy bản rộng W
      return [x * 0.96 + z * 0.24, -y * 0.98 - z * 0.14];
    }
    if (angle === "top") {
      // Nhìn từ trên cao xuống mặt cánh ngang và thanh giằng bên dưới
      return [x * 0.92 + z * 0.35, -y * 0.45 + x * 0.22 - z * 0.78];
    }
    // Góc chụp 3/4 khớp 95% với bức ảnh mẫu của khách hàng
    return [x * 0.90 + z * 0.50, -y * 0.96 + x * 0.37 - z * 0.30];
  };

  // Tính bounding box 2D để căn giữa vào khung box
  const samplePts: [number, number][] = [];
  for (const xx of [0, g.L]) {
    for (const yy of [0, g.H]) {
      for (const zz of [0, g.W]) {
        samplePts.push(projectRaw(xx, yy, zz));
      }
    }
  }
  const uMin = Math.min(...samplePts.map((p) => p[0]));
  const uMax = Math.max(...samplePts.map((p) => p[0]));
  const vMin = Math.min(...samplePts.map((p) => p[1]));
  const vMax = Math.max(...samplePts.map((p) => p[1]));

  const pad = options.showDimensions ? 24 : 16;
  const sc = Math.min(
    (box.w - pad * 2) / Math.max(1, uMax - uMin),
    (box.h - pad * 2) / Math.max(1, vMax - vMin)
  );
  const uMid = (uMin + uMax) / 2;
  const vMid = (vMin + vMax) / 2;
  const cxBox = box.x + box.w / 2;
  const cyBox = box.y + box.h / 2;

  const P = (x: number, y: number, z: number): [number, number] => {
    const [u, v] = projectRaw(x, y, z);
    return [cxBox + (u - uMid) * sc, cyBox + (v - vMid) * sc];
  };
  const Ps = (x: number, y: number, z: number): string => {
    const [px, py] = P(x, y, z);
    return `${f(px)},${f(py)}`;
  };
  const ptsToPath = (pts: [number, number][]) =>
    pts.map((pt, idx) => `${idx === 0 ? "M" : "L"}${f(pt[0])},${f(pt[1])}`).join(" ") + " Z";

  const out: string[] = [];

  // Định nghĩa Gradient kim loại sơn tĩnh điện đen mờ (Matte Black Powder Coated Steel)
  out.push(
    `<defs>`,
    `  <linearGradient id="${pfx}-wallFace" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `    <stop offset="0%" stop-color="#334155"/>`,
    `    <stop offset="45%" stop-color="#1e293b"/>`,
    `    <stop offset="100%" stop-color="#0f172a"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="${pfx}-shelfTop" x1="0%" y1="0%" x2="100%" y2="40%">`,
    `    <stop offset="0%" stop-color="#475569"/>`,
    `    <stop offset="50%" stop-color="#334155"/>`,
    `    <stop offset="100%" stop-color="#1e293b"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="${pfx}-strutFace" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `    <stop offset="0%" stop-color="#1e293b"/>`,
    `    <stop offset="60%" stop-color="#0f172a"/>`,
    `    <stop offset="100%" stop-color="#090d16"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="${pfx}-holeRim" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `    <stop offset="0%" stop-color="#94a3b8"/>`,
    `    <stop offset="45%" stop-color="#475569"/>`,
    `    <stop offset="100%" stop-color="#0f172a"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="${pfx}-cskBevel" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `    <stop offset="0%" stop-color="#cbd5e1"/>`,
    `    <stop offset="35%" stop-color="#334155"/>`,
    `    <stop offset="100%" stop-color="#020617"/>`,
    `  </linearGradient>`,
    `</defs>`
  );

  // -------------------------------------------------------------------------
  // 1. CÁNH ĐỨNG ÁP TƯỜNG (x: 0..T, y: 0..H-rOut, z: 0..W) + ĐÁY BO TRÒN R = W/2
  // -------------------------------------------------------------------------
  const arcSteps = 18;
  // Dải cạnh dày bên trái (z = 0) và cung đáy của cánh đứng
  const wallLeftEdgePts: string[] = [
    Ps(0, g.H - g.rOut, 0),
    Ps(0, g.rEnd, 0),
  ];
  const wallInnerBotPts: string[] = [];
  for (let i = 0; i <= arcSteps / 2; i++) {
    const th = -Math.PI / 2 + (i / (arcSteps / 2)) * (Math.PI / 2);
    const yy = g.rEnd * (1 - Math.cos(th));
    const zz = g.rEnd * (1 + Math.sin(th));
    wallLeftEdgePts.push(Ps(0, yy, zz));
    wallInnerBotPts.unshift(Ps(g.T, yy, zz));
  }
  wallInnerBotPts.push(Ps(g.T, g.rEnd, 0), Ps(g.T, g.H - g.rOut, 0));
  out.push(
    `<polygon points="${[...wallLeftEdgePts, ...wallInnerBotPts].join(" ")}" fill="#090d16" stroke="#334155" stroke-width="0.9" stroke-linejoin="round"/>`
  );

  // Mặt trong của cánh đứng (x = T) với đáy bo tròn bán nguyệt R = W/2
  const wallFrontPoly: [number, number][] = [
    P(g.T, g.H - g.rOut, 0),
    P(g.T, g.rEnd, 0),
  ];
  for (let i = 1; i <= arcSteps; i++) {
    const th = -Math.PI / 2 + (i / arcSteps) * Math.PI;
    const yy = g.rEnd * (1 - Math.cos(th));
    const zz = g.rEnd * (1 + Math.sin(th));
    wallFrontPoly.push(P(g.T, yy, zz));
  }
  wallFrontPoly.push(P(g.T, g.H - g.rOut, g.W));
  out.push(
    `<path d="${ptsToPath(wallFrontPoly)}" fill="url(#${pfx}-wallFace)" stroke="#475569" stroke-width="1" stroke-linejoin="round"/>`
  );

  // 2 Lỗ vít âm côn (Countersunk holes) trên cánh đứng
  const drawWallCountersunkHole = (yCenter: number) => {
    const rOuter = g.wallCskDia / 2;
    const rInner = g.wallHoleDia / 2;
    const cskPts: [number, number][] = [];
    const holePts: [number, number][] = [];
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      cskPts.push(P(g.T, yCenter + rOuter * Math.cos(a), g.W / 2 + rOuter * Math.sin(a)));
      holePts.push(P(g.T * 0.25, yCenter + rInner * Math.cos(a), g.W / 2 + rInner * Math.sin(a)));
    }
    out.push(
      `<path d="${ptsToPath(cskPts)}" fill="url(#${pfx}-cskBevel)" stroke="#64748b" stroke-width="0.8"/>`,
      `<path d="${ptsToPath(holePts)}" fill="${holeBg}" stroke="#1e293b" stroke-width="0.8"/>`
    );
  };
  drawWallCountersunkHole(g.yWallTop);
  drawWallCountersunkHole(g.yWallBot);

  // -------------------------------------------------------------------------
  // 2. THANH GIẰNG CHÉO ĐỤC 3 LỖ TRÒN XUYÊN THẤU (z: z0..z1 ở giữa bản rộng W)
  // -------------------------------------------------------------------------
  const z0 = (g.W - g.T) / 2;
  const z1 = (g.W + g.T) / 2;

  // Dải độ dày cạnh trên của thanh giằng (giữa z0 và z1)
  const [pTopW, pTopS, pBotS, pBotH, pBotW] = g.strutPoly;
  out.push(
    `<polygon points="${Ps(pTopW[0], pTopW[1], z0)} ${Ps(pTopS[0], pTopS[1], z0)} ${Ps(pTopS[0], pTopS[1], z1)} ${Ps(pTopW[0], pTopW[1], z1)}" fill="#334155" stroke="#475569" stroke-width="0.8" stroke-linejoin="round"/>`,
    `<polygon points="${Ps(pBotW[0], pBotW[1], z0)} ${Ps(pBotH[0], pBotH[1], z0)} ${Ps(pBotS[0], pBotS[1], z0)} ${Ps(pBotS[0], pBotS[1], z1)} ${Ps(pBotH[0], pBotH[1], z1)} ${Ps(pBotW[0], pBotW[1], z1)}" fill="#090d16" stroke="#334155" stroke-width="0.8" stroke-linejoin="round"/>`
  );

  // Vẽ thành trụ 3D bên trong của 3 lỗ tròn và nền xuyên thấu trước khi đậy mặt phẳng khoét lỗ lên
  const holeCircleSteps = 28;
  const frontHolePaths: string[] = [];

  g.strutHoles.forEach((h, idx) => {
    const frontPts: [number, number][] = [];
    const backPts: [number, number][] = [];
    for (let i = 0; i < holeCircleSteps; i++) {
      const a = (i / holeCircleSteps) * Math.PI * 2;
      const hx = h.cx + h.r * Math.cos(a);
      const hy = h.cy + h.r * Math.sin(a);
      frontPts.push(P(hx, hy, z0));
      backPts.push(P(hx, hy, z1));
    }
    const frontPathStr = ptsToPath(frontPts);
    const backPathStr = ptsToPath(backPts);
    frontHolePaths.push(frontPathStr);

    const clipId = `${pfx}-hclip-${idx}`;
    out.push(
      `<clipPath id="${clipId}"><path d="${frontPathStr}"/></clipPath>`,
      `<g clip-path="url(#${clipId})">`,
      `  <path d="${frontPathStr}" fill="url(#${pfx}-holeRim)"/>`,
      `  <path d="${backPathStr}" fill="${holeBg}" stroke="#334155" stroke-width="1"/>`,
      `</g>`
    );
  });

  // Mặt phẳng chính của thanh giằng (z = z0) có khoét thủng 3 lỗ tròn bằng fill-rule="evenodd"
  const strutOuterPts = g.strutPoly.map(([x, y]) => P(x, y, z0));
  const strutCompoundPath = [ptsToPath(strutOuterPts), ...frontHolePaths].join(" ");
  out.push(
    `<path d="${strutCompoundPath}" fill="url(#${pfx}-strutFace)" fill-rule="evenodd" stroke="#475569" stroke-width="1" stroke-linejoin="round"/>`
  );

  // Viền highlight cho 3 lỗ tròn mặt trước
  for (const fp of frontHolePaths) {
    out.push(`<path d="${fp}" fill="none" stroke="#64748b" stroke-width="0.9"/>`);
  }

  // -------------------------------------------------------------------------
  // 3. GÓC UỐN CONG 90° (CURVED BEND CORNER) & CÁNH NGANG ĐỠ KỆ BO TRÒN MŨI
  // -------------------------------------------------------------------------
  const bendSteps = 10;
  const cxBend = g.rOut;
  const cyBend = g.H - g.rOut;
  for (let i = 0; i < bendSteps; i++) {
    const a0 = (i / bendSteps) * (Math.PI / 2);
    const a1 = ((i + 1) / bendSteps) * (Math.PI / 2);
    const xOut0 = cxBend - g.rOut * Math.cos(a0);
    const yOut0 = cyBend + g.rOut * Math.sin(a0);
    const xOut1 = cxBend - g.rOut * Math.cos(a1);
    const yOut1 = cyBend + g.rOut * Math.sin(a1);

    const xIn0 = cxBend - g.rIn * Math.cos(a0);
    const yIn0 = cyBend + g.rIn * Math.sin(a0);
    const xIn1 = cxBend - g.rIn * Math.cos(a1);
    const yIn1 = cyBend + g.rIn * Math.sin(a1);

    // Dải mặt cong lưng góc uốn (với hiệu ứng ánh sáng specular ở giữa góc uốn)
    const shade = i >= 3 && i <= 6 ? "#475569" : i >= 2 && i <= 7 ? "#334155" : "#1e293b";
    out.push(
      `<polygon points="${Ps(xOut0, yOut0, 0)} ${Ps(xOut1, yOut1, 0)} ${Ps(xOut1, yOut1, g.W)} ${Ps(xOut0, yOut0, g.W)}" fill="${shade}" stroke="${shade}" stroke-width="0.5"/>`,
      `<polygon points="${Ps(xOut0, yOut0, 0)} ${Ps(xOut1, yOut1, 0)} ${Ps(xIn1, yIn1, 0)} ${Ps(xIn0, yIn0, 0)}" fill="#090d16" stroke="#1e293b" stroke-width="0.5"/>`
    );
  }

  // Dải cạnh dày mép gần (z = 0) và đầu mũi bo tròn của cánh ngang
  const shelfSideTopPts: string[] = [Ps(g.rOut, g.H, 0), Ps(g.L - g.rEnd, g.H, 0)];
  const shelfSideBotPts: string[] = [];
  for (let i = 0; i <= arcSteps / 2; i++) {
    const th = -Math.PI / 2 + (i / (arcSteps / 2)) * (Math.PI / 2);
    const xx = g.L - g.rEnd + g.rEnd * Math.cos(th);
    const zz = g.rEnd * (1 + Math.sin(th));
    shelfSideTopPts.push(Ps(xx, g.H, zz));
    shelfSideBotPts.unshift(Ps(xx, g.H - g.T, zz));
  }
  shelfSideBotPts.push(Ps(g.L - g.rEnd, g.H - g.T, 0), Ps(g.rOut, g.H - g.T, 0));
  out.push(
    `<polygon points="${[...shelfSideTopPts, ...shelfSideBotPts].join(" ")}" fill="#090d16" stroke="#334155" stroke-width="0.9" stroke-linejoin="round"/>`
  );

  // Mặt trên của cánh ngang (y = H) với mũi phải bo tròn bán nguyệt R = W/2
  const shelfTopPoly: [number, number][] = [
    P(g.rOut, g.H, 0),
    P(g.L - g.rEnd, g.H, 0),
  ];
  for (let i = 1; i <= arcSteps; i++) {
    const th = -Math.PI / 2 + (i / arcSteps) * Math.PI;
    const xx = g.L - g.rEnd + g.rEnd * Math.cos(th);
    const zz = g.rEnd * (1 + Math.sin(th));
    shelfTopPoly.push(P(xx, g.H, zz));
  }
  shelfTopPoly.push(P(g.rOut, g.H, g.W));
  out.push(
    `<path d="${ptsToPath(shelfTopPoly)}" fill="url(#${pfx}-shelfTop)" stroke="#64748b" stroke-width="1" stroke-linejoin="round"/>`
  );

  // 2 Lỗ vít bắt kệ trên mặt cánh ngang (y = H)
  const drawShelfHole = (xCenter: number) => {
    const r = g.shelfHoleDia / 2;
    const pts: [number, number][] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      pts.push(P(xCenter + r * Math.cos(a), g.H, g.W / 2 + r * Math.sin(a)));
    }
    out.push(`<path d="${ptsToPath(pts)}" fill="#020617" stroke="#64748b" stroke-width="0.8"/>`);
  };
  drawShelfHole(g.xShelfIn);
  drawShelfHole(g.xShelfOut);

  // Chi tiết Mộng chữ nhật của thanh giằng xuyên lên mặt trên cánh ngang (Tenon joint)
  const tx0 = g.xB - g.tenonLen / 2;
  const tx1 = g.xB + g.tenonLen / 2;
  const tz0 = (g.W - g.T) / 2;
  const tz1 = (g.W + g.T) / 2;
  const tH = g.H + 1.2;
  out.push(
    // Viền khe mộng trên mặt cánh ngang
    `<polygon points="${Ps(tx0 - 1.2, g.H, tz0 - 1)} ${Ps(tx1 + 1.2, g.H, tz0 - 1)} ${Ps(tx1 + 1.2, g.H, tz1 + 1)} ${Ps(tx0 - 1.2, g.H, tz1 + 1)}" fill="#020617" stroke="#475569" stroke-width="0.6"/>`,
    // Đầu mộng nhô nhẹ lên và tán cố định
    `<polygon points="${Ps(tx0, tH, tz0)} ${Ps(tx1, tH, tz0)} ${Ps(tx1, tH, tz1)} ${Ps(tx0, tH, tz1)}" fill="#1e293b" stroke="#94a3b8" stroke-width="0.8"/>`
  );

  // Ký hiệu kích thước bao 3D nếu bật
  if (options.showDimensions) {
    const [pTopL_x, pTopL_y] = P(0, g.H, g.W);
    const [pTopR_x, pTopR_y] = P(g.L, g.H, g.W);
    const [pBot_x, pBot_y] = P(0, 0, 0);
    const [pTopF_x, pTopF_y] = P(0, g.H, 0);
    out.push(
      `<line x1="${f(pTopL_x)}" y1="${f(pTopL_y - 14)}" x2="${f(pTopR_x)}" y2="${f(pTopR_y - 14)}" stroke="#0284c7" stroke-width="1.2" stroke-dasharray="3 2"/>`,
      `<text x="${f((pTopL_x + pTopR_x) / 2 + 10)}" y="${f((pTopL_y + pTopR_y) / 2 - 20)}" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle">L = ${g.L} mm</text>`,
      `<line x1="${f(pTopF_x - 16)}" y1="${f(pTopF_y)}" x2="${f(pBot_x - 16)}" y2="${f(pBot_y)}" stroke="#0284c7" stroke-width="1.2" stroke-dasharray="3 2"/>`,
      `<text x="${f(pTopF_x - 24)}" y="${f((pTopF_y + pBot_y) / 2)}" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="end">H = ${g.H}</text>`
    );
  }

  return out.join("\n");
}

// ---------------------------------------------------------------------------
// RENDER BẢN VẼ CAD 2D & 3D CHUYÊN NGHIỆP CHO KE ĐỠ CHỮ L THANH GIẰNG 3 LỖ TRÒN
// ---------------------------------------------------------------------------

function renderStrutBracketSvg(spec: CadSpec, meta: { date: string; code: string }): string {
  const g = extractStrutBracketGeometry(spec);
  const PW = 1600;
  const PH = 1130;
  const LINE = "#0f172a";
  const DIM = "#1d4ed8";
  const CENTER = "#dc2626";
  const HIDDEN = "#475569";

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" font-family="Arial, Helvetica, sans-serif">`,
    `<defs>`,
    `  <marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">`,
    `    <path d="M0,1.2 L10,5 L0,8.8 z" fill="${DIM}"/>`,
    `  </marker>`,
    `  <marker id="ar-lead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">`,
    `    <path d="M0,1.5 L10,5 L0,8.5 z" fill="#0f172a"/>`,
    `  </marker>`,
    `  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">`,
    `    <path d="M20,0 L0,0 0,20" fill="none" stroke="#f1f5f9" stroke-width="1"/>`,
    `  </pattern>`,
    `  <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">`,
    `    <line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" stroke-width="1"/>`,
    `  </pattern>`,
    `</defs>`,
    `<rect width="${PW}" height="${PH}" fill="#ffffff"/>`,
    `<rect x="35" y="35" width="${PW - 70}" height="${PH - 70}" fill="url(#grid)"/>`,
    `<rect x="20" y="20" width="${PW - 40}" height="${PH - 40}" fill="none" stroke="${LINE}" stroke-width="1"/>`,
    `<rect x="35" y="35" width="${PW - 70}" height="${PH - 70}" fill="none" stroke="${LINE}" stroke-width="2.5"/>`
  );

  // Hàm vẽ đường kích thước chuẩn ISO
  const dimH = (x1: number, x2: number, yFrom: number, yDim: number, textVal: string | number) => {
    const dir = yDim >= yFrom ? 1 : -1;
    out.push(
      `<line x1="${f(x1)}" y1="${f(yFrom + 3 * dir)}" x2="${f(x1)}" y2="${f(yDim + 6 * dir)}" stroke="${DIM}" stroke-width="0.85"/>`,
      `<line x1="${f(x2)}" y1="${f(yFrom + 3 * dir)}" x2="${f(x2)}" y2="${f(yDim + 6 * dir)}" stroke="${DIM}" stroke-width="0.85"/>`,
      `<line x1="${f(x1)}" y1="${f(yDim)}" x2="${f(x2)}" y2="${f(yDim)}" stroke="${DIM}" stroke-width="1.1" marker-start="url(#ar)" marker-end="url(#ar)"/>`,
      `<text x="${f((x1 + x2) / 2)}" y="${f(yDim - 5)}" font-size="12.5" font-weight="bold" fill="${DIM}" text-anchor="middle">${esc(String(textVal))}</text>`
    );
  };

  const dimV = (y1: number, y2: number, xFrom: number, xDim: number, textVal: string | number) => {
    const dir = xDim >= xFrom ? 1 : -1;
    const cx = xDim - 6;
    const cy = (y1 + y2) / 2;
    out.push(
      `<line x1="${f(xFrom + 3 * dir)}" y1="${f(y1)}" x2="${f(xDim + 6 * dir)}" y2="${f(y1)}" stroke="${DIM}" stroke-width="0.85"/>`,
      `<line x1="${f(xFrom + 3 * dir)}" y1="${f(y2)}" x2="${f(xDim + 6 * dir)}" y2="${f(y2)}" stroke="${DIM}" stroke-width="0.85"/>`,
      `<line x1="${f(xDim)}" y1="${f(y1)}" x2="${f(xDim)}" y2="${f(y2)}" stroke="${DIM}" stroke-width="1.1" marker-start="url(#ar)" marker-end="url(#ar)"/>`,
      `<text x="${f(cx)}" y="${f(cy)}" font-size="12.5" font-weight="bold" fill="${DIM}" text-anchor="middle" transform="rotate(-90 ${f(cx)} ${f(cy)})">${esc(String(textVal))}</text>`
    );
  };

  const leader = (xTarget: number, yTarget: number, xKnee: number, yKnee: number, xEnd: number, labelStr: string, subStr?: string) => {
    const anchor = xEnd >= xKnee ? "start" : "end";
    const tx = xEnd >= xKnee ? xKnee + 6 : xKnee - 6;
    out.push(
      `<polyline points="${f(xTarget)},${f(yTarget)} ${f(xKnee)},${f(yKnee)} ${f(xEnd)},${f(yKnee)}" fill="none" stroke="#0f172a" stroke-width="1" marker-start="url(#ar-lead)"/>`,
      `<text x="${f(tx)}" y="${f(yKnee - 4)}" font-size="11.5" font-weight="bold" fill="#0f172a" text-anchor="${anchor}">${esc(labelStr)}</text>`
    );
    if (subStr) {
      out.push(
        `<text x="${f(tx)}" y="${f(yKnee + 12)}" font-size="10.5" fill="#475569" text-anchor="${anchor}">${esc(subStr)}</text>`
      );
    }
  };

  // Tính tỷ lệ scale chung cho 3 hình chiếu vuông góc (Chiếu đứng, Chiếu bằng, Chiếu trước)
  const sc = Math.min(410 / g.L, 380 / g.H, 150 / g.W);

  // Gốc tọa độ Hình chiếu đứng (Side Elevation View):
  // x: SX0 -> SX0 + L*sc, y: SY_TOP (y=H) -> SY_BOT (y=0)
  const SX0 = 165;
  const SY_TOP = 395;
  const SY_BOT = SY_TOP + g.H * sc;
  const sx = (xMm: number) => SX0 + xMm * sc;
  const sy = (yMm: number) => SY_BOT - yMm * sc;

  // Gốc tọa độ Hình chiếu bằng (Top View - nằm ngay phía trên Hình chiếu đứng, cùng hoành độ SX0):
  const TY0 = 125;
  const TY_BOT = TY0 + g.W * sc;
  const TY_MID = TY0 + (g.W / 2) * sc;
  const tz = (zMm: number) => TY0 + zMm * sc;

  // Gốc tọa độ Hình chiếu trước (Front Wall View - nằm bên phải Hình chiếu đứng, cùng cao độ SY_TOP..SY_BOT):
  const FX0 = SX0 + g.L * sc + 135;
  const FX_MID = FX0 + (g.W / 2) * sc;
  const fz = (zMm: number) => FX0 + zMm * sc;

  // Đường gióng liên kết giữa 3 hình chiếu (Projection alignment lines)
  out.push(
    `<g stroke="#cbd5e1" stroke-width="0.8" stroke-dasharray="4 4">`,
    `  <line x1="${f(SX0)}" y1="${f(TY_BOT)}" x2="${f(SX0)}" y2="${f(SY_TOP)}"/>`,
    `  <line x1="${f(sx(g.L))}" y1="${f(TY_MID)}" x2="${f(sx(g.L))}" y2="${f(SY_TOP)}"/>`,
    `  <line x1="${f(sx(g.xB))}" y1="${f(TY_BOT)}" x2="${f(sx(g.xB))}" y2="${f(SY_TOP)}"/>`,
    `  <line x1="${f(sx(g.L))}" y1="${f(SY_TOP)}" x2="${f(FX0)}" y2="${f(SY_TOP)}"/>`,
    `  <line x1="${f(SX0)}" y1="${f(SY_BOT)}" x2="${f(FX0)}" y2="${f(SY_BOT)}"/>`,
    `  <line x1="${f(sx(g.T))}" y1="${f(sy(g.yWallTop))}" x2="${f(FX0)}" y2="${f(sy(g.yWallTop))}"/>`,
    `  <line x1="${f(sx(g.T))}" y1="${f(sy(g.yWallBot))}" x2="${f(FX0)}" y2="${f(sy(g.yWallBot))}"/>`,
    `</g>`
  );

  // =========================================================================
  // 1. HÌNH CHIẾU BẰNG (TOP VIEW - NHÌN TỪ TRÊN XUỐNG CÁNH NGANG)
  // =========================================================================
  const rEndPx = g.rEnd * sc;
  const topViewPath = [
    `M ${f(SX0)},${f(TY0)}`,
    `L ${f(sx(g.L - g.rEnd))},${f(TY0)}`,
    `A ${f(rEndPx)},${f(rEndPx)} 0 0 1 ${f(sx(g.L - g.rEnd))},${f(TY_BOT)}`,
    `L ${f(SX0)},${f(TY_BOT)}`,
    `Z`,
  ].join(" ");

  out.push(
    `<text x="${f(SX0 + (g.L * sc) / 2)}" y="${f(TY0 - 42)}" font-size="14" font-weight="900" fill="${LINE}" text-anchor="middle" letter-spacing="0.8">HÌNH CHIẾU BẰNG (MẶT TRÊN CÁNH NGANG)</text>`,
    `<path d="${topViewPath}" fill="#f8fafc" stroke="${LINE}" stroke-width="2"/>`,
    // Vạch bắt đầu góc uốn và mặt trong cánh đứng
    `<line x1="${f(sx(g.T))}" y1="${f(TY0)}" x2="${f(sx(g.T))}" y2="${f(TY_BOT)}" stroke="${LINE}" stroke-width="1.1" stroke-dasharray="5 3"/>`,
    `<line x1="${f(sx(g.rOut))}" y1="${f(TY0)}" x2="${f(sx(g.rOut))}" y2="${f(TY_BOT)}" stroke="#64748b" stroke-width="0.8"/>`,
    // Nét khuất của thanh giằng chéo dày T chạy ở chính giữa bên dưới cánh ngang
    `<line x1="${f(sx(g.T))}" y1="${f(tz((g.W - g.T) / 2))}" x2="${f(sx(g.strutPoly[2][0]))}" y2="${f(tz((g.W - g.T) / 2))}" stroke="${HIDDEN}" stroke-width="1" stroke-dasharray="5 2.5"/>`,
    `<line x1="${f(sx(g.T))}" y1="${f(tz((g.W + g.T) / 2))}" x2="${f(sx(g.strutPoly[2][0]))}" y2="${f(tz((g.W + g.T) / 2))}" stroke="${HIDDEN}" stroke-width="1" stroke-dasharray="5 2.5"/>`,
    // Đường trục đối xứng tâm cánh ngang
    `<line x1="${f(SX0 - 18)}" y1="${f(TY_MID)}" x2="${f(sx(g.L) + 18)}" y2="${f(TY_MID)}" stroke="${CENTER}" stroke-width="0.9" stroke-dasharray="14 4 3 4"/>`,
    // Tâm cung bo tròn đầu mũi R = W/2
    `<line x1="${f(sx(g.L - g.rEnd))}" y1="${f(TY_MID - 8)}" x2="${f(sx(g.L - g.rEnd))}" y2="${f(TY_MID + 8)}" stroke="${CENTER}" stroke-width="0.9"/>`,
    // Lỗ vít trong và lỗ vít ngoài trên cánh ngang
    `<circle cx="${f(sx(g.xShelfIn))}" cy="${f(TY_MID)}" r="${f((g.shelfHoleDia / 2) * sc)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.5"/>`,
    `<line x1="${f(sx(g.xShelfIn))}" y1="${f(TY_MID - 10)}" x2="${f(sx(g.xShelfIn))}" y2="${f(TY_MID + 10)}" stroke="${CENTER}" stroke-width="0.8"/>`,
    `<circle cx="${f(sx(g.xShelfOut))}" cy="${f(TY_MID)}" r="${f((g.shelfHoleDia / 2) * sc)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.5"/>`,
    `<line x1="${f(sx(g.xShelfOut))}" y1="${f(TY_MID - 10)}" x2="${f(sx(g.xShelfOut))}" y2="${f(TY_MID + 10)}" stroke="${CENTER}" stroke-width="0.8"/>`,
    // Lỗ mộng chữ nhật (Tenon slot) ở vị trí xB nơi thanh giằng chéo xuyên lên
    `<rect x="${f(sx(g.xB - g.tenonLen / 2))}" y="${f(tz((g.W - g.T) / 2))}" width="${f(g.tenonLen * sc)}" height="${f(g.T * sc)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.6"/>`
  );

  // Kích thước Hình chiếu bằng
  dimV(TY0, TY_BOT, SX0, SX0 - 38, `W=${g.W}`);
  dimH(SX0, sx(g.xShelfIn), TY0, TY0 - 18, g.xShelfIn);
  dimH(SX0, sx(g.xB), TY_BOT, TY_BOT + 24, g.xB);
  dimH(sx(g.xShelfOut), sx(g.L), TY0, TY0 - 18, g.xShelfOutFromTip);
  leader(
    sx(g.L - g.rEnd * 0.29),
    TY0 + g.rEnd * 0.29 * sc,
    sx(g.L) + 18,
    TY0 - 12,
    sx(g.L) + 95,
    `Bo đầu tròn R${g.rEnd}`,
    `2 lỗ vít kệ Ø${g.shelfHoleDia}`
  );

  // =========================================================================
  // 2. HÌNH CHIẾU ĐỨNG / MẶT CẠNH (SIDE ELEVATION VIEW - CHÍNH)
  // =========================================================================
  const rOutPx = g.rOut * sc;
  const rInPx = g.rIn * sc;

  // Biên dạng chữ L có góc uốn cong chuẩn cơ khí (rOut và rIn)
  const lBodyPath = [
    `M ${f(sx(0))},${f(sy(0))}`,
    `L ${f(sx(0))},${f(sy(g.H - g.rOut))}`,
    `A ${f(rOutPx)},${f(rOutPx)} 0 0 1 ${f(sx(g.rOut))},${f(sy(g.H))}`,
    `L ${f(sx(g.L))},${f(sy(g.H))}`,
    `L ${f(sx(g.L))},${f(sy(g.H - g.T))}`,
    `L ${f(sx(g.rOut))},${f(sy(g.H - g.T))}`,
    `A ${f(rInPx)},${f(rInPx)} 0 0 0 ${f(sx(g.T))},${f(sy(g.H - g.rOut))}`,
    `L ${f(sx(g.T))},${f(sy(0))}`,
    `Z`,
  ].join(" ");

  // Đa giác thanh giằng chéo trong Hình chiếu đứng
  const strutSvgPts = g.strutPoly.map(([x, y]) => `${f(sx(x))},${f(sy(y))}`).join(" ");

  out.push(
    // Thanh giằng chéo
    `<polygon points="${strutSvgPts}" fill="#f1f5f9" stroke="${LINE}" stroke-width="2.1" stroke-linejoin="round"/>`,
    // Thân chữ L chính
    `<path d="${lBodyPath}" fill="#e2e8f0" stroke="${LINE}" stroke-width="2.2" stroke-linejoin="round"/>`,
    // Đầu mộng chữ nhật của thanh giằng xuyên qua cánh ngang (Tenon joint)
    `<rect x="${f(sx(g.xB - g.tenonLen / 2))}" y="${f(sy(g.H + 1.2))}" width="${f(g.tenonLen * sc)}" height="${f((g.T + 1.2) * sc)}" fill="#94a3b8" stroke="${LINE}" stroke-width="1.5"/>`
  );

  // Ký hiệu mối hàn góc nhỏ tại chân thanh giằng và cổ mộng
  out.push(
    `<polygon points="${f(sx(g.T))},${f(sy(g.strutPoly[0][1]))} ${f(sx(g.T + 4))},${f(sy(g.strutPoly[0][1]))} ${f(sx(g.T))},${f(sy(g.strutPoly[0][1] + 4))}" fill="${LINE}"/>`,
    `<polygon points="${f(sx(g.strutPoly[1][0]))},${f(sy(g.yB))} ${f(sx(g.strutPoly[1][0] - 4))},${f(sy(g.yB))} ${f(sx(g.strutPoly[1][0]))},${f(sy(g.yB - 4))}" fill="${LINE}"/>`
  );

  // Đường trục tâm nghiêng của thanh giằng chéo (Centerline axis)
  const extAxis = 14;
  const axX1 = g.xA - g.ux * extAxis;
  const axY1 = g.yA - g.uy * extAxis;
  const axX2 = g.xB + g.ux * extAxis;
  const axY2 = g.yB + g.uy * extAxis;
  out.push(
    `<line x1="${f(sx(axX1))}" y1="${f(sy(axY1))}" x2="${f(sx(axX2))}" y2="${f(sy(axY2))}" stroke="${CENTER}" stroke-width="1" stroke-dasharray="14 4 3 4"/>`
  );

  // 3 Lỗ tròn bằng nhau nằm thẳng hàng dọc theo đường tâm thanh giằng chéo
  g.strutHoles.forEach((h, idx) => {
    const cxPx = sx(h.cx);
    const cyPx = sy(h.cy);
    const rPx = h.r * sc;
    const crossExt = h.r + 6;
    const nx1 = sx(h.cx - g.nx * crossExt);
    const ny1 = sy(h.cy - g.ny * crossExt);
    const nx2 = sx(h.cx + g.nx * crossExt);
    const ny2 = sy(h.cy + g.ny * crossExt);

    out.push(
      `<circle cx="${f(cxPx)}" cy="${f(cyPx)}" r="${f(rPx)}" fill="#ffffff" stroke="${LINE}" stroke-width="2"/>`,
      `<line x1="${f(nx1)}" y1="${f(ny1)}" x2="${f(nx2)}" y2="${f(ny2)}" stroke="${CENTER}" stroke-width="0.9" stroke-dasharray="6 2 2 2"/>`,
      `<text x="${f(cxPx + g.nx * (h.r + 10) * sc)}" y="${f(cyPx - g.ny * (h.r + 10) * sc)}" font-size="10.5" font-weight="bold" fill="${CENTER}" text-anchor="middle">#${idx + 1}</text>`
    );
  });

  // Nét khuất (hidden lines) biểu diễn 2 lỗ vít âm côn xuyên qua cánh đứng (x: 0 -> T)
  const drawWallHoleHiddenSide = (yCenter: number) => {
    const rInH = g.wallHoleDia / 2;
    const rCsk = g.wallCskDia / 2;
    const cskDepth = Math.min(g.T * 0.55, (rCsk - rInH));
    const xNeck = g.T - cskDepth;
    out.push(
      `<line x1="${f(sx(0))}" y1="${f(sy(yCenter + rInH))}" x2="${f(sx(xNeck))}" y2="${f(sy(yCenter + rInH))}" stroke="${HIDDEN}" stroke-width="1" stroke-dasharray="3 2"/>`,
      `<line x1="${f(sx(0))}" y1="${f(sy(yCenter - rInH))}" x2="${f(sx(xNeck))}" y2="${f(sy(yCenter - rInH))}" stroke="${HIDDEN}" stroke-width="1" stroke-dasharray="3 2"/>`,
      `<line x1="${f(sx(xNeck))}" y1="${f(sy(yCenter + rInH))}" x2="${f(sx(g.T))}" y2="${f(sy(yCenter + rCsk))}" stroke="${HIDDEN}" stroke-width="1"/>`,
      `<line x1="${f(sx(xNeck))}" y1="${f(sy(yCenter - rInH))}" x2="${f(sx(g.T))}" y2="${f(sy(yCenter - rCsk))}" stroke="${HIDDEN}" stroke-width="1"/>`,
      `<line x1="${f(sx(-8))}" y1="${f(sy(yCenter))}" x2="${f(sx(g.T + 10))}" y2="${f(sy(yCenter))}" stroke="${CENTER}" stroke-width="0.85" stroke-dasharray="8 2 2 2"/>`
    );
  };
  drawWallHoleHiddenSide(g.yWallTop);
  drawWallHoleHiddenSide(g.yWallBot);

  // Nét khuất (hidden lines) của 2 lỗ vít trên cánh ngang (y: H-T -> H)
  for (const xHole of [g.xShelfIn, g.xShelfOut]) {
    const rH = g.shelfHoleDia / 2;
    out.push(
      `<line x1="${f(sx(xHole - rH))}" y1="${f(sy(g.H))}" x2="${f(sx(xHole - rH))}" y2="${f(sy(g.H - g.T))}" stroke="${HIDDEN}" stroke-width="1" stroke-dasharray="3 2"/>`,
      `<line x1="${f(sx(xHole + rH))}" y1="${f(sy(g.H))}" x2="${f(sx(xHole + rH))}" y2="${f(sy(g.H - g.T))}" stroke="${HIDDEN}" stroke-width="1" stroke-dasharray="3 2"/>`,
      `<line x1="${f(sx(xHole))}" y1="${f(sy(g.H + 8))}" x2="${f(sx(xHole))}" y2="${f(sy(g.H - g.T - 8))}" stroke="${CENTER}" stroke-width="0.85" stroke-dasharray="8 2 2 2"/>`
    );
  }

  // Tiêu đề Hình chiếu đứng
  out.push(
    `<text x="${f(SX0 + (g.L * sc) / 2)}" y="${f(SY_BOT + 96)}" font-size="15" font-weight="900" fill="${LINE}" text-anchor="middle" letter-spacing="1">HÌNH CHIẾU ĐỨNG / MẶT CẠNH (KẾT CẤU CHÍNH)</text>`,
    `<line x1="${f(SX0 + (g.L * sc) / 2 - 140)}" y1="${f(SY_BOT + 103)}" x2="${f(SX0 + (g.L * sc) / 2 + 140)}" y2="${f(SY_BOT + 103)}" stroke="${LINE}" stroke-width="1.8"/>`
  );

  // Các đường kích thước của Hình chiếu đứng
  // Ngang dưới
  dimH(SX0, sx(g.xB), SY_BOT, SY_BOT + 32, `L giằng = ${g.lBraceFromBack}`);
  dimH(SX0, sx(g.L), SY_BOT, SY_BOT + 64, `Tổng dài L = ${g.L}`);
  // Dọc trái
  dimV(SY_TOP, sy(g.yWallTop), SX0, SX0 - 34, g.yWallTopFromTop);
  dimV(SY_TOP, sy(g.yA), SX0, SX0 - 64, `H giằng = ${g.hBraceFromTop}`);
  dimV(sy(g.yWallBot), SY_BOT, SX0, SX0 - 34, g.yWallBot);
  dimV(SY_TOP, SY_BOT, SX0, SX0 - 94, `Tổng cao H = ${g.H}`);

  // Leader lines chỉ dẫn chi tiết trên Hình chiếu đứng
  const hole2 = g.strutHoles[1];
  const hole2EdgeX = sx(hole2.cx - g.nx * hole2.r);
  const hole2EdgeY = sy(hole2.cy - g.ny * hole2.r);
  leader(
    hole2EdgeX,
    hole2EdgeY,
    hole2EdgeX + 48,
    hole2EdgeY + 42,
    hole2EdgeX + 205,
    `3 Lỗ tròn Ø${g.holeDia} mm xuyên thấu`,
    `Thẳng hàng trục ${g.angleDeg}° · Bước tâm P=${g.holePitch}mm`
  );

  const strutMidX = sx(g.strutHoles[2].cx - g.nx * (g.bStrut / 2));
  const strutMidY = sy(g.strutHoles[2].cy - g.ny * (g.bStrut / 2));
  leader(
    strutMidX,
    strutMidY,
    strutMidX + 45,
    strutMidY + 25,
    strutMidX + 185,
    `Thanh giằng bản ${g.bStrut}×${g.T} mm`,
    `Đầu trên lắp mộng ${g.tenonLen}×${g.T}mm & hàn TIG`
  );

  leader(
    sx(g.rOut * 0.35),
    sy(g.H - g.rOut * 0.35),
    sx(g.rOut) + 25,
    SY_TOP - 28,
    sx(g.rOut) + 155,
    `Chấn vuông 90° (R trong ${g.rIn} / R ngoài ${g.rOut})`,
    `Thép dẹt dày T = ${g.T} mm`
  );

  // =========================================================================
  // 3. HÌNH CHIẾU TRƯỚC / MẶT ÁP TƯỜNG (FRONT WALL VIEW)
  // =========================================================================
  const frontViewPath = [
    `M ${f(FX0)},${f(SY_TOP)}`,
    `L ${f(fz(g.W))},${f(SY_TOP)}`,
    `L ${f(fz(g.W))},${f(sy(g.rEnd))}`,
    `A ${f(rEndPx)},${f(rEndPx)} 0 0 1 ${f(FX0)},${f(sy(g.rEnd))}`,
    `Z`,
  ].join(" ");

  out.push(
    `<text x="${f(FX_MID)}" y="${f(SY_TOP - 24)}" font-size="14" font-weight="900" fill="${LINE}" text-anchor="middle">HÌNH CHIẾU TRƯỚC</text>`,
    `<text x="${f(FX_MID)}" y="${f(SY_TOP - 8)}" font-size="11" fill="#475569" text-anchor="middle">(Mặt cánh đứng áp tường)</text>`,
    `<path d="${frontViewPath}" fill="#f8fafc" stroke="${LINE}" stroke-width="2"/>`,
    // Đường độ dày cánh ngang và góc uốn ở đỉnh
    `<line x1="${f(FX0)}" y1="${f(sy(g.H - g.T))}" x2="${f(fz(g.W))}" y2="${f(sy(g.H - g.T))}" stroke="${LINE}" stroke-width="1.4"/>`,
    `<line x1="${f(FX0)}" y1="${f(sy(g.H - g.rOut))}" x2="${f(fz(g.W))}" y2="${f(sy(g.H - g.rOut))}" stroke="#64748b" stroke-width="0.8" stroke-dasharray="4 2"/>`,
    // Đường tâm trục đứng
    `<line x1="${f(FX_MID)}" y1="${f(SY_TOP - 6)}" x2="${f(FX_MID)}" y2="${f(SY_BOT + 18)}" stroke="${CENTER}" stroke-width="0.9" stroke-dasharray="14 4 3 4"/>`,
    // Hình chiếu cạnh của thanh giằng chéo dày T nằm chính giữa bản rộng W
    `<rect x="${f(fz((g.W - g.T) / 2))}" y="${f(sy(g.H - g.T))}" width="${f(g.T * sc)}" height="${f((g.H - g.T - g.strutPoly[4][1]) * sc)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.5"/>`,
    // 2 Lỗ vít âm côn (Countersunk holes: 2 vòng tròn đồng tâm Ø6.5 và Ø12)
    `<circle cx="${f(FX_MID)}" cy="${f(sy(g.yWallTop))}" r="${f((g.wallCskDia / 2) * sc)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.1"/>`,
    `<circle cx="${f(FX_MID)}" cy="${f(sy(g.yWallTop))}" r="${f((g.wallHoleDia / 2) * sc)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.8"/>`,
    `<line x1="${f(FX_MID - 14)}" y1="${f(sy(g.yWallTop))}" x2="${f(FX_MID + 14)}" y2="${f(sy(g.yWallTop))}" stroke="${CENTER}" stroke-width="0.8"/>`,
    `<circle cx="${f(FX_MID)}" cy="${f(sy(g.yWallBot))}" r="${f((g.wallCskDia / 2) * sc)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.1"/>`,
    `<circle cx="${f(FX_MID)}" cy="${f(sy(g.yWallBot))}" r="${f((g.wallHoleDia / 2) * sc)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.8"/>`,
    `<line x1="${f(FX_MID - 14)}" y1="${f(sy(g.yWallBot))}" x2="${f(FX_MID + 14)}" y2="${f(sy(g.yWallBot))}" stroke="${CENTER}" stroke-width="0.8"/>`
  );

  // Vạch nét đứt vị trí 3 lỗ tròn trên thanh giằng nhìn từ phía trước
  for (const h of g.strutHoles) {
    const yTopH = sy(h.cy + h.r * g.ux);
    const yBotH = sy(h.cy - h.r * g.ux);
    out.push(
      `<line x1="${f(fz((g.W - g.T) / 2))}" y1="${f(yTopH)}" x2="${f(fz((g.W + g.T) / 2))}" y2="${f(yTopH)}" stroke="${HIDDEN}" stroke-width="0.9" stroke-dasharray="2 1.5"/>`,
      `<line x1="${f(fz((g.W - g.T) / 2))}" y1="${f(yBotH)}" x2="${f(fz((g.W + g.T) / 2))}" y2="${f(yBotH)}" stroke="${HIDDEN}" stroke-width="0.9" stroke-dasharray="2 1.5"/>`
    );
  }

  dimH(FX0, fz(g.W), SY_BOT, SY_BOT + 32, `W=${g.W}`);
  leader(
    FX_MID + (g.wallCskDia / 2) * sc * 0.7,
    sy(g.yWallTop) - (g.wallCskDia / 2) * sc * 0.7,
    fz(g.W) + 18,
    sy(g.yWallTop) - 18,
    fz(g.W) + 125,
    `2 Lỗ vít âm Ø${g.wallHoleDia}`,
    `Vát côn âm Ø${g.wallCskDia}×90°`
  );
  leader(
    fz(g.W * 0.85),
    sy(g.rEnd * 0.3),
    fz(g.W) + 18,
    SY_BOT - 12,
    fz(g.W) + 115,
    `Bo tròn đáy R${g.rEnd}`
  );

  // =========================================================================
  // 4. HÌNH TRÍCH MẶT CẮT CHI TIẾT (LỖ VÍT ÂM CÔN 90° & MỘNG THANH GIẰNG)
  // =========================================================================
  const DX0 = FX0 - 20;
  const DY0 = 75;
  const DW = 250;
  const DH = 215;
  out.push(
    `<rect x="${f(DX0)}" y="${f(DY0)}" width="${DW}" height="${DH}" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>`,
    `<text x="${f(DX0 + DW / 2)}" y="${f(DY0 + 22)}" font-size="12" font-weight="900" fill="${LINE}" text-anchor="middle">CHI TIẾT CẮT A-A: LỖ VÍT ÂM 90°</text>`,
    // Vẽ mặt cắt phóng đại lỗ vít âm côn
    `<polygon points="${f(DX0 + 45)},${f(DY0 + 45)} ${f(DX0 + 135)},${f(DY0 + 45)} ${f(DX0 + 110)},${f(DY0 + 70)} ${f(DX0 + 110)},${f(DY0 + 105)} ${f(DX0 + 45)},${f(DY0 + 105)}" fill="url(#hatch)" stroke="${LINE}" stroke-width="1.6"/>`,
    `<polygon points="${f(DX0 + 165)},${f(DY0 + 45)} ${f(DX0 + 215)},${f(DY0 + 45)} ${f(DX0 + 215)},${f(DY0 + 105)} ${f(DX0 + 140)},${f(DY0 + 105)} ${f(DX0 + 140)},${f(DY0 + 70)}" fill="url(#hatch)" stroke="${LINE}" stroke-width="1.6"/>`,
    `<line x1="${f(DX0 + 125)}" y1="${f(DY0 + 35)}" x2="${f(DX0 + 125)}" y2="${f(DY0 + 115)}" stroke="${CENTER}" stroke-width="0.9" stroke-dasharray="10 3 2 3"/>`,
    `<text x="${f(DX0 + 125)}" y="${f(DY0 + 128)}" font-size="11" font-weight="bold" fill="${DIM}" text-anchor="middle">Lỗ suốt Ø${g.wallHoleDia} · Loe côn Ø${g.wallCskDia}×90°</text>`,
    `<line x1="${f(DX0 + 15)}" y1="${f(DY0 + 142)}" x2="${f(DX0 + DW - 15)}" y2="${f(DY0 + 142)}" stroke="#cbd5e1" stroke-width="1"/>`,
    `<text x="${f(DX0 + DW / 2)}" y="${f(DY0 + 162)}" font-size="11.5" font-weight="bold" fill="${LINE}" text-anchor="middle">CHI TIẾT B: MỘNG GHẾP THANH GIẰNG</text>`,
    `<text x="${f(DX0 + DW / 2)}" y="${f(DY0 + 180)}" font-size="11" fill="#334155" text-anchor="middle">Đột lỗ mộng chữ nhật ${g.tenonLen}×${g.T} mm trên cánh</text>`,
    `<text x="${f(DX0 + DW / 2)}" y="${f(DY0 + 196)}" font-size="11" fill="#334155" text-anchor="middle">ngang, xuyên đầu giằng và hàn TIG âm phẳng</text>`
  );

  // =========================================================================
  // 5. HÌNH CHIẾU TRỤC ĐO 3D (ISOMETRIC 3D VIEW - GIỐNG 95% ẢNH MẪU)
  // =========================================================================
  const IX0 = 985;
  const IY0 = 55;
  const IW = 555;
  const IH = 465;

  out.push(
    `<rect x="${IX0}" y="${IY0}" width="${IW}" height="${IH}" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.6"/>`,
    `<text x="${IX0 + 18}" y="${IY0 + 28}" font-size="14" font-weight="900" fill="${LINE}" letter-spacing="0.6">PHỐI CẢNH TRỤC ĐO 3D (ISOMETRIC VIEW)</text>`,
    `<text x="${IX0 + IW - 16}" y="${IY0 + 28}" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="end">Sơn tĩnh điện đen mờ · Tỷ lệ thực</text>`,
    renderStrutBracket3dElements(
      g,
      { x: IX0 + 10, y: IY0 + 36, w: IW - 20, h: IH - 46 },
      { angle: "perspective", holeBgColor: "#f8fafc", idPrefix: "cadIso", showDimensions: true }
    )
  );

  // =========================================================================
  // 6. BẢNG KÊ CHI TIẾT (BOM) + YÊU CẦU KỸ THUẬT + KHUNG TÊN ISO 9001
  // =========================================================================
  const BX = 985;
  const BY = 540;
  const BW = 555;
  const cols = [BX, BX + 42, BX + 275, BX + 325, BX + BW];
  const rowH = 26;

  const bomRows = [
    {
      name: `Thân ke chữ L (Bo tròn 2 đầu R${g.rEnd})`,
      qty: "01",
      size: `Phôi dẹt ${(g.L + g.H - g.T * 1.6).toFixed(0)} × ${g.W} × ${g.T} mm`,
    },
    {
      name: `Thanh giằng chéo đục 3 lỗ Ø${g.holeDia}`,
      qty: "01",
      size: `${Math.round(g.axisLen + 16)} × ${g.bStrut} × ${g.T} mm`,
    },
    {
      name: `Gia công đột mộng & khoan côn âm`,
      qty: "07 lỗ",
      size: `3×Ø${g.holeDia} + 2×Ø${g.wallHoleDia} CSK + 2×Ø${g.shelfHoleDia}`,
    },
  ];

  out.push(
    `<text x="${BX}" y="${BY + 16}" font-size="13.5" font-weight="900" fill="${LINE}" letter-spacing="0.5">BẢNG KÊ PHÔI &amp; CHI TIẾT GIA CÔNG (BOM)</text>`
  );

  let yTable = BY + 26;
  const totalBomH = (bomRows.length + 1) * rowH;
  out.push(
    `<rect x="${BX}" y="${yTable}" width="${BW}" height="${totalBomH}" fill="#ffffff" stroke="${LINE}" stroke-width="1.4"/>`,
    `<rect x="${BX}" y="${yTable}" width="${BW}" height="${rowH}" fill="#e2e8f0" stroke="${LINE}" stroke-width="1.4"/>`
  );
  for (const c of cols.slice(1, 4)) {
    out.push(`<line x1="${c}" y1="${yTable}" x2="${c}" y2="${yTable + totalBomH}" stroke="${LINE}" stroke-width="0.9"/>`);
  }
  out.push(
    `<text x="${cols[0] + 21}" y="${yTable + 17}" font-size="11.5" font-weight="bold" fill="${LINE}" text-anchor="middle">STT</text>`,
    `<text x="${cols[1] + 8}" y="${yTable + 17}" font-size="11.5" font-weight="bold" fill="${LINE}">Tên chi tiết gia công</text>`,
    `<text x="${cols[2] + 25}" y="${yTable + 17}" font-size="11.5" font-weight="bold" fill="${LINE}" text-anchor="middle">SL</text>`,
    `<text x="${cols[3] + 8}" y="${yTable + 17}" font-size="11.5" font-weight="bold" fill="${LINE}">Quy cách phôi (mm)</text>`
  );

  bomRows.forEach((r, idx) => {
    yTable += rowH;
    out.push(
      `<line x1="${BX}" y1="${yTable}" x2="${BX + BW}" y2="${yTable}" stroke="${LINE}" stroke-width="0.6"/>`,
      `<text x="${cols[0] + 21}" y="${yTable + 17}" font-size="11.5" fill="${LINE}" text-anchor="middle">${idx + 1}</text>`,
      `<text x="${cols[1] + 8}" y="${yTable + 17}" font-size="11.5" font-weight="bold" fill="${LINE}">${esc(r.name)}</text>`,
      `<text x="${cols[2] + 25}" y="${yTable + 17}" font-size="11.5" fill="${LINE}" text-anchor="middle">${esc(r.qty)}</text>`,
      `<text x="${cols[3] + 8}" y="${yTable + 17}" font-size="11.5" fill="#1e293b">${esc(r.size)}</text>`
    );
  });

  // Ghi chú kỹ thuật gia công
  const techNotes = [
    `1. Cắt Laser Fiber CNC phôi thép tấm SS400 dày T=${g.T}mm, bo tròn 2 đầu bán nguyệt R=${g.rEnd}mm.`,
    `2. Chấn gấp CNC góc 90° ±0.2° tại đỉnh chữ L (bán kính uốn trong R=${g.rIn}mm, ngoài R=${g.rOut}mm).`,
    `3. Thanh giằng chéo bản ${g.bStrut}×${g.T}mm đột 3 lỗ tròn Ø${g.holeDia}mm thẳng hàng trục nghiêng ${g.angleDeg}°.`,
    `4. Lắp mộng chữ nhật ${g.tenonLen}×${g.T}mm vào cánh ngang, hàn TIG ngấu kín, mài nhẵn và sơn tĩnh điện đen mờ.`,
    ...(spec.notes || []).slice(0, 1).map((n) => `5. ${n}`),
  ];

  let yNote = yTable + rowH + 24;
  out.push(
    `<text x="${BX}" y="${yNote}" font-size="13" font-weight="900" fill="${LINE}" letter-spacing="0.5">YÊU CẦU KỸ THUẬT GIA CÔNG CNC:</text>`
  );
  techNotes.forEach((tn) => {
    yNote += 19;
    out.push(`<text x="${BX}" y="${yNote}" font-size="11.5" fill="#334155">${esc(trunc(tn, 88))}</text>`);
  });

  // Khung tên bản vẽ chuẩn ISO 9001
  const TX = 985;
  const TY = 900;
  const TW = 555;
  const TH = 175;
  const cleanTitle = spec.title.replace(/\s*\(Theo thông số.*\)/i, "").trim();
  out.push(
    `<rect x="${TX}" y="${TY}" width="${TW}" height="${TH}" fill="#f8fafc" stroke="${LINE}" stroke-width="2"/>`,
    `<rect x="${TX}" y="${TY}" width="${TW}" height="36" fill="#0f2a5c"/>`,
    `<text x="${TX + 14}" y="${TY + 23}" font-size="12.5" font-weight="900" fill="#ffffff" letter-spacing="0.5">XƯỞNG GIA CÔNG CƠ KHÍ CHÍNH XÁC CNC &amp; LASER</text>`,
    `<text x="${TX + TW - 14}" y="${TY + 23}" font-size="11" font-weight="bold" fill="#38bdf8" text-anchor="end">ISO 9001 · CAD PARAMETRIC</text>`,
    `<text x="${TX + 12}" y="${TY + 60}" font-size="13.5" font-weight="900" fill="#0f172a">${esc(trunc(cleanTitle.toUpperCase(), 38))}</text>`,
    `<text x="${TX + 12}" y="${TY + 86}" font-size="11.5" fill="#334155"><tspan font-weight="bold">Quy cách:</tspan> Dài L=${g.L} × Rộng W=${g.W} × Cao H=${g.H} × Dày T=${g.T} mm</text>`,
    `<text x="${TX + 12}" y="${TY + 110}" font-size="11.5" fill="#334155"><tspan font-weight="bold">Vật liệu:</tspan> ${esc(trunc(spec.material, 42))}</text>`,
    `<text x="${TX + 12}" y="${TY + 134}" font-size="11.5" fill="#334155"><tspan font-weight="bold">Hoàn thiện:</tspan> ${esc(trunc(spec.finish, 40))}</text>`,
    `<text x="${TX + 12}" y="${TY + 158}" font-size="11.5" fill="#0369a1" font-weight="bold">Kết cấu: Chữ L bo đầu R${g.rEnd} + Giằng 3 lỗ Ø${g.holeDia} + Mộng hàn TIG</text>`,
    `<line x1="${TX + TW - 162}" y1="${TY + 36}" x2="${TX + TW - 162}" y2="${TY + TH}" stroke="${LINE}" stroke-width="1.2"/>`,
    `<text x="${TX + TW - 150}" y="${TY + 60}" font-size="11.5" fill="#475569">Mã BV: <tspan font-weight="bold" fill="#0f172a">${esc(meta.code)}</tspan></text>`,
    `<text x="${TX + TW - 150}" y="${TY + 86}" font-size="11.5" fill="#475569">Ngày: <tspan font-weight="bold" fill="#0f172a">${esc(meta.date)}</tspan></text>`,
    `<text x="${TX + TW - 150}" y="${TY + 112}" font-size="11.5" fill="#475569">Đơn vị: <tspan font-weight="bold" fill="#0f172a">mm</tspan></text>`,
    `<text x="${TX + TW - 150}" y="${TY + 136}" font-size="11.5" fill="#475569">Dung sai: <tspan font-weight="bold" fill="#0f172a">±0.05 mm</tspan></text>`,
    `<text x="${TX + TW - 150}" y="${TY + 158}" font-size="11.5" font-weight="bold" fill="#15803d">✓ Chuẩn mẫu 95%</text>`,
    `</svg>`
  );

  return out.join("\n");
}

// ---------------------------------------------------------------------------
// RENDER FILE AUTOCAD .DXF R12 CHO KE ĐỠ CHỮ L THANH GIẰNG 3 LỖ TRÒN
// ---------------------------------------------------------------------------

function renderStrutBracketDxf(spec: CadSpec): string {
  const g = extractStrutBracketGeometry(spec);
  const out: string[] = ["0", "SECTION", "2", "ENTITIES"];
  const n = (v: number) => (Math.round(v * 1000) / 1000).toString();

  const line = (layer: string, x1: number, y1: number, x2: number, y2: number) =>
    out.push("0", "LINE", "8", layer, "10", n(x1), "20", n(y1), "30", "0", "11", n(x2), "21", n(y2), "31", "0");
  const circle = (layer: string, x: number, y: number, r: number) =>
    out.push("0", "CIRCLE", "8", layer, "10", n(x), "20", n(y), "30", "0", "40", n(r));
  const arc = (layer: string, cx: number, cy: number, r: number, startDeg: number, endDeg: number) =>
    out.push("0", "ARC", "8", layer, "10", n(cx), "20", n(cy), "30", "0", "40", n(r), "50", n(startDeg), "51", n(endDeg));
  const text = (layer: string, x: number, y: number, h: number, s: string) =>
    out.push("0", "TEXT", "8", layer, "10", n(x), "20", n(y), "30", "0", "40", n(h), "1", toAscii(s));

  // 1. SIDE VIEW (Hình chiếu đứng tại gốc 0,0)
  // Cánh đứng + góc uốn + cánh ngang
  line("OUTLINE", 0, 0, 0, g.H - g.rOut);
  arc("OUTLINE", g.rOut, g.H - g.rOut, g.rOut, 90, 180);
  line("OUTLINE", g.rOut, g.H, g.L, g.H);
  line("OUTLINE", g.L, g.H, g.L, g.H - g.T);
  line("OUTLINE", g.L, g.H - g.T, g.rOut, g.H - g.T);
  arc("OUTLINE", g.rOut, g.H - g.rOut, g.rIn, 90, 180);
  line("OUTLINE", g.T, g.H - g.rOut, g.T, 0);
  line("OUTLINE", g.T, 0, 0, 0);

  // Thanh giằng chéo
  for (let i = 0; i < g.strutPoly.length; i++) {
    const p1 = g.strutPoly[i];
    const p2 = g.strutPoly[(i + 1) % g.strutPoly.length];
    line("STRUT", p1[0], p1[1], p2[0], p2[1]);
  }

  // 3 lỗ tròn trên thanh giằng chéo + tâm lỗ
  line("CENTERLINE", g.xA, g.yA, g.xB, g.yB);
  for (const h of g.strutHoles) {
    circle("HOLES", h.cx, h.cy, h.r);
  }

  // Mộng chữ nhật trên cánh ngang
  line("TENON", g.xB - g.tenonLen / 2, g.H - g.T, g.xB - g.tenonLen / 2, g.H + 1);
  line("TENON", g.xB + g.tenonLen / 2, g.H - g.T, g.xB + g.tenonLen / 2, g.H + 1);
  line("TENON", g.xB - g.tenonLen / 2, g.H + 1, g.xB + g.tenonLen / 2, g.H + 1);

  // 2. TOP VIEW (Hình chiếu bằng tại Y = H + 90)
  const ty = g.H + 90;
  line("TOP_VIEW", 0, ty, g.L - g.rEnd, ty);
  line("TOP_VIEW", 0, ty + g.W, g.L - g.rEnd, ty + g.W);
  line("TOP_VIEW", 0, ty, 0, ty + g.W);
  arc("TOP_VIEW", g.L - g.rEnd, ty + g.rEnd, g.rEnd, -90, 90);
  circle("HOLES", g.xShelfIn, ty + g.rEnd, g.shelfHoleDia / 2);
  circle("HOLES", g.xShelfOut, ty + g.rEnd, g.shelfHoleDia / 2);
  // Lỗ mộng chữ nhật trên hình chiếu bằng
  const tz0 = ty + (g.W - g.T) / 2;
  line("TENON", g.xB - g.tenonLen / 2, tz0, g.xB + g.tenonLen / 2, tz0);
  line("TENON", g.xB + g.tenonLen / 2, tz0, g.xB + g.tenonLen / 2, tz0 + g.T);
  line("TENON", g.xB + g.tenonLen / 2, tz0 + g.T, g.xB - g.tenonLen / 2, tz0 + g.T);
  line("TENON", g.xB - g.tenonLen / 2, tz0 + g.T, g.xB - g.tenonLen / 2, tz0);

  // 3. FRONT VIEW (Hình chiếu trước tại X = L + 90)
  const fx = g.L + 90;
  line("FRONT_VIEW", fx, g.rEnd, fx, g.H);
  line("FRONT_VIEW", fx + g.W, g.rEnd, fx + g.W, g.H);
  line("FRONT_VIEW", fx, g.H, fx + g.W, g.H);
  arc("FRONT_VIEW", fx + g.rEnd, g.rEnd, g.rEnd, 180, 360);
  // 2 lỗ vít âm côn (2 vòng tròn đồng tâm)
  circle("HOLES", fx + g.rEnd, g.yWallTop, g.wallHoleDia / 2);
  circle("COUNTERSINK", fx + g.rEnd, g.yWallTop, g.wallCskDia / 2);
  circle("HOLES", fx + g.rEnd, g.yWallBot, g.wallHoleDia / 2);
  circle("COUNTERSINK", fx + g.rEnd, g.yWallBot, g.wallCskDia / 2);

  // Nhãn & kích thước
  text("TITLE", 0, -35, 8, `${spec.title} - L=${g.L} x W=${g.W} x H=${g.H} x T=${g.T} mm`);
  text("TITLE", 0, -50, 6, `3 Lightening Holes D=${g.holeDia}mm on ${g.angleDeg} deg Diagonal Brace`);

  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// RENDER BẢN VẼ TỦ QUẦN ÁO CHUYÊN NGHIỆP THEO CHUẨN AUTOCAD
// (Gồm: Mặt đứng có cánh + Mặt đứng bỏ cánh kết cấu + Mặt bằng cắt A-A)
// ---------------------------------------------------------------------------

function renderWardrobeSvg(spec: CadSpec, meta: { date: string; code: string }): string {
  const { W: rawW, H: rawH, D: rawD } = bounds(spec);
  const L = Math.max(1200, Math.round(rawW || 2115));
  const H = Math.max(1500, Math.round(rawH || 2650));
  const D = Math.max(400, Math.round(rawD || 600));

  // Trích xuất độ dày vách T từ thông số hoặc parts
  let detectedT = 20;
  const matchT =
    (spec.title || "").match(/T=(\d+(?:\.\d+)?)/i) ||
    (spec.assumptions?.[0] || "").match(/Dày (\d+(?:\.\d+)?)/i);
  if (matchT) {
    detectedT = parseFloat(matchT[1]);
  } else {
    const thinParts = (spec.parts || []).filter((p) => p.w <= 35 || p.h <= 35 || p.d <= 35);
    if (thinParts.length > 0) {
      detectedT = Math.round(
        thinParts[0].w <= 35 ? thinParts[0].w : thinParts[0].h <= 35 ? thinParts[0].h : thinParts[0].d
      );
    }
  }
  const T = Math.max(12, Math.min(40, Math.round(detectedT || 20)));

  // Tỷ lệ các thành phần theo thiết kế chuẩn (L=2115, S=300, W1=908, W2=908)
  const S = Math.max(200, Math.min(500, Math.round(L * (300 / 2115))));
  const Lcab = L - S;
  const W1 = Math.round(Lcab / 2);
  const W2 = Lcab - W1;
  const wd1 = Math.round(W1 / 2);
  const wd2 = Math.round(W2 / 2);

  const inW1 = W1 - 1.5 * T;
  const inW2 = W2 - 1.5 * T;
  const drawerW = Math.round((inW2 - T) / 2);

  const hTop = Math.max(60, Math.min(140, Math.round(H * (100 / 2650))));
  const hPlinth = Math.max(40, Math.min(80, Math.round(H * (50 / 2650))));
  const hBase = hPlinth + T; // Thường là 70mm khi hPlinth=50, T=20
  const hAvail = H - hTop - hBase; // Chiều cao lọt lòng thân tủ
  const hLuggage = Math.max(250, Math.min(500, Math.round(hAvail * (370 / 2480))));
  const hMainBody = hAvail - hLuggage - T;
  const hHanging = Math.max(800, Math.min(1500, Math.round(hMainBody * (1280 / 2090))));
  const hLower = hMainBody - hHanging - 2 * T;
  const hCompartmentMid = Math.max(150, Math.round(hLower * (300 / 770)));
  const hCompartmentBot = hLower - hCompartmentMid;

  const hFlip = hLuggage + T;
  const hMain = hMainBody + 2 * T;
  const hDrawers = hCompartmentMid + hCompartmentBot + 2 * T;
  const hRdoor = hMain - hDrawers;
  const hDrawerRow = Math.round(hDrawers / 2);

  const PW = 2200;
  const PH = 1350;
  const LINE = "#0f172a";
  const DIM = "#1d4ed8";
  const RED = "#dc2626";
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" font-family="Arial, Helvetica, sans-serif">`,
    `<defs>`,
    `<marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="${DIM}"/></marker>`,
    `<marker id="ar_red" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="${RED}"/></marker>`,
    `<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20,0 L0,0 0,20" fill="none" stroke="#f1f5f9" stroke-width="1"/></pattern>`,
    `<pattern id="ghatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" stroke-width="1.2"/></pattern>`,
    `</defs>`,
    `<rect width="${PW}" height="${PH}" fill="#ffffff"/>`,
    `<rect x="25" y="25" width="${PW - 50}" height="${PH - 50}" fill="none" stroke="${LINE}" stroke-width="1.5"/>`,
    `<rect x="35" y="35" width="${PW - 70}" height="${PH - 70}" fill="none" stroke="${LINE}" stroke-width="2.5"/>`
  );

  const scale = Math.min(740 / L, 720 / H);

  // Kích thước vẽ trên canvas
  const cW = L * scale;
  const cH = H * scale;

  // Tọa độ hình chiếu 1: MẶT ĐỨNG CÓ CÁNH
  const X1 = 140;
  const Y1 = 120;
  const Y1_bottom = Y1 + cH;

  // Tọa độ hình chiếu 2: MẶT ĐỨNG BỎ CÁNH
  const X2 = X1 + cW + 180;
  const Y2 = 120;
  const Y2_bottom = Y2 + cH;

  // Helper hàm vẽ đường kích thước
  const dimH = (x1: number, x2: number, yFrom: number, yDim: number, val: number | string) => {
    const dir = yDim > yFrom ? 1 : -1;
    out.push(
      `<path d="M${f(x1)},${f(yFrom + 2 * dir)}V${f(yDim + 5 * dir)}M${f(x2)},${f(yFrom + 2 * dir)}V${f(yDim + 5 * dir)}" stroke="${DIM}" stroke-width="0.8" fill="none"/>`,
      `<line x1="${f(x1)}" y1="${f(yDim)}" x2="${f(x2)}" y2="${f(yDim)}" stroke="${DIM}" stroke-width="1" marker-start="url(#ar)" marker-end="url(#ar)"/>`,
      `<text x="${f((x1 + x2) / 2)}" y="${f(yDim - 4)}" font-size="12" font-weight="bold" fill="${DIM}" text-anchor="middle">${val}</text>`
    );
  };

  const dimV = (y1: number, y2: number, xFrom: number, xDim: number, val: number | string) => {
    const dir = xDim > xFrom ? 1 : -1;
    out.push(
      `<path d="M${f(xFrom + 2 * dir)},${f(y1)}H${f(xDim + 5 * dir)}M${f(xFrom + 2 * dir)},${f(y2)}H${f(xDim + 5 * dir)}" stroke="${DIM}" stroke-width="0.8" fill="none"/>`,
      `<line x1="${f(xDim)}" y1="${f(y1)}" x2="${f(xDim)}" y2="${f(y2)}" stroke="${DIM}" stroke-width="1" marker-start="url(#ar)" marker-end="url(#ar)"/>`,
      `<text x="${f(xDim - 4)}" y="${f((y1 + y2) / 2 + 4)}" font-size="12" font-weight="bold" fill="${DIM}" text-anchor="end" transform="rotate(-90 ${f(xDim - 4)} ${f((y1 + y2) / 2 + 4)})">${val}</text>`
    );
  };

  // Helper vẽ mặt đất có gạch chéo
  const drawGround = (x: number, y: number, w: number) => {
    out.push(
      `<line x1="${f(x - 30)}" y1="${f(y)}" x2="${f(x + w + 30)}" y2="${f(y)}" stroke="${LINE}" stroke-width="1.8"/>`,
      `<rect x="${f(x - 30)}" y="${f(y)}" width="${f(w + 60)}" height="16" fill="url(#ghatch)"/>`
    );
  };

  // ---------------------------------------------------------------------------
  // 1. VẼ MẶT ĐỨNG CÓ CÁNH (BÊN TRÁI)
  // ---------------------------------------------------------------------------
  drawGround(X1, Y1_bottom, cW);

  // Len chân đáy tủ (cao hBase)
  const yBaseTop1 = Y1_bottom - hBase * scale;
  out.push(
    `<rect x="${f(X1)}" y="${f(yBaseTop1)}" width="${f(cW)}" height="${f(hBase * scale)}" fill="#f8fafc" stroke="${LINE}" stroke-width="1.6"/>`
  );

  // Phào nóc đỉnh tủ (cao hTop)
  const yTopBot1 = Y1 + hTop * scale;
  out.push(
    `<rect x="${f(X1)}" y="${f(Y1)}" width="${f(cW)}" height="${f(hTop * scale)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.8"/>`
  );

  // Khung ngoài thân tủ
  out.push(
    `<rect x="${f(X1)}" y="${f(yTopBot1)}" width="${f(Lcab * scale)}" height="${f((H - hTop - hBase) * scale)}" fill="#ffffff" stroke="${LINE}" stroke-width="2.2"/>`
  );

  // Đường phân cách 2 buồng chính
  const xMid1 = X1 + W1 * scale;
  out.push(
    `<line x1="${f(xMid1)}" y1="${f(yTopBot1)}" x2="${f(xMid1)}" y2="${f(yBaseTop1)}" stroke="${LINE}" stroke-width="1.8"/>`
  );

  // Cánh lật nóc 2 buồng
  const yFlipBot1 = yTopBot1 + hFlip * scale;
  out.push(
    `<line x1="${f(X1)}" y1="${f(yFlipBot1)}" x2="${f(X1 + Lcab * scale)}" y2="${f(yFlipBot1)}" stroke="${LINE}" stroke-width="1.8"/>`
  );

  // Ô cánh lật trái
  out.push(
    `<rect x="${f(X1 + 4)}" y="${f(yTopBot1 + 4)}" width="${f(W1 * scale - 8)}" height="${f(hFlip * scale - 8)}" fill="#fafafa" stroke="${LINE}" stroke-width="1.2"/>`,
    `<rect x="${f(X1 + 10)}" y="${f(yTopBot1 + 10)}" width="${f(W1 * scale - 20)}" height="${f(hFlip * scale - 20)}" fill="none" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<text x="${f(X1 + (W1 * scale) / 2)}" y="${f(yTopBot1 + (hFlip * scale) / 2 + 5)}" font-size="12" font-weight="bold" fill="#334155" text-anchor="middle">CÁNH LẬT</text>`
  );

  // Ô cánh lật phải
  out.push(
    `<rect x="${f(xMid1 + 4)}" y="${f(yTopBot1 + 4)}" width="${f(W2 * scale - 8)}" height="${f(hFlip * scale - 8)}" fill="#fafafa" stroke="${LINE}" stroke-width="1.2"/>`,
    `<rect x="${f(xMid1 + 10)}" y="${f(yTopBot1 + 10)}" width="${f(W2 * scale - 20)}" height="${f(hFlip * scale - 20)}" fill="none" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<text x="${f(xMid1 + (W2 * scale) / 2)}" y="${f(yTopBot1 + (hFlip * scale) / 2 + 5)}" font-size="12" font-weight="bold" fill="#334155" text-anchor="middle">CÁNH LẬT</text>`
  );

  // BUỒNG TRÁI: 2 CÁNH MỞ DÀI
  const xDoorLeftSplit = X1 + wd1 * scale;
  const hDoorLeftPx = (hMain) * scale;
  out.push(
    `<line x1="${f(xDoorLeftSplit)}" y1="${f(yFlipBot1)}" x2="${f(xDoorLeftSplit)}" y2="${f(yBaseTop1)}" stroke="${LINE}" stroke-width="1.5"/>`
  );

  // Cánh trái 1
  out.push(
    `<rect x="${f(X1 + 4)}" y="${f(yFlipBot1 + 4)}" width="${f(wd1 * scale - 8)}" height="${f(hDoorLeftPx - 8)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.2"/>`,
    `<rect x="${f(X1 + 10)}" y="${f(yFlipBot1 + 10)}" width="${f(wd1 * scale - 20)}" height="${f(hDoorLeftPx - 20)}" fill="none" stroke="#94a3b8" stroke-width="0.8"/>`,
    // Nét đứt thể hiện chiều mở cánh (bản lề bên trái, mở về giữa)
    `<path d="M${f(X1 + 4)},${f(yFlipBot1 + 4)} L${f(xDoorLeftSplit - 4)},${f(yFlipBot1 + hDoorLeftPx / 2)} L${f(X1 + 4)},${f(yBaseTop1 - 4)}" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6 3"/>`,
    // Tay nắm cánh trái
    `<rect x="${f(xDoorLeftSplit - 8)}" y="${f(yFlipBot1 + hDoorLeftPx / 2 - 25)}" width="3" height="50" rx="1.5" fill="#0f172a"/>`
  );

  // Cánh trái 2
  out.push(
    `<rect x="${f(xDoorLeftSplit + 4)}" y="${f(yFlipBot1 + 4)}" width="${f(wd1 * scale - 8)}" height="${f(hDoorLeftPx - 8)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.2"/>`,
    `<rect x="${f(xDoorLeftSplit + 10)}" y="${f(yFlipBot1 + 10)}" width="${f(wd1 * scale - 20)}" height="${f(hDoorLeftPx - 20)}" fill="none" stroke="#94a3b8" stroke-width="0.8"/>`,
    // Nét đứt mở cánh (bản lề bên phải)
    `<path d="M${f(xMid1 - 4)},${f(yFlipBot1 + 4)} L${f(xDoorLeftSplit + 4)},${f(yFlipBot1 + hDoorLeftPx / 2)} L${f(xMid1 - 4)},${f(yBaseTop1 - 4)}" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6 3"/>`,
    // Tay nắm cánh phải
    `<rect x="${f(xDoorLeftSplit + 5)}" y="${f(yFlipBot1 + hDoorLeftPx / 2 - 25)}" width="3" height="50" rx="1.5" fill="#0f172a"/>`
  );

  // Nhãn chữ buồng trái
  out.push(
    `<text x="${f(X1 + (W1 * scale) / 2)}" y="${f(yFlipBot1 + hDoorLeftPx / 2 - 8)}" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle">2 CÁNH MỞ</text>`,
    `<text x="${f(X1 + (W1 * scale) / 2)}" y="${f(yFlipBot1 + hDoorLeftPx / 2 + 8)}" font-size="10" fill="#64748b" text-anchor="middle">MÀU TRẮNG</text>`
  );

  // BUỒNG PHẢI TRÊN: 2 CÁNH MỞ NGẮN
  const yDrawersTop1 = yBaseTop1 - hDrawers * scale;
  const xDoorRightSplit = xMid1 + wd2 * scale;
  const hDoorRightPx = hRdoor * scale;
  out.push(
    `<line x1="${f(xMid1)}" y1="${f(yDrawersTop1)}" x2="${f(X1 + Lcab * scale)}" y2="${f(yDrawersTop1)}" stroke="${LINE}" stroke-width="1.8"/>`,
    `<line x1="${f(xDoorRightSplit)}" y1="${f(yFlipBot1)}" x2="${f(xDoorRightSplit)}" y2="${f(yDrawersTop1)}" stroke="${LINE}" stroke-width="1.5"/>`
  );

  // Cánh phải 1
  out.push(
    `<rect x="${f(xMid1 + 4)}" y="${f(yFlipBot1 + 4)}" width="${f(wd2 * scale - 8)}" height="${f(hDoorRightPx - 8)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.2"/>`,
    `<rect x="${f(xMid1 + 10)}" y="${f(yFlipBot1 + 10)}" width="${f(wd2 * scale - 20)}" height="${f(hDoorRightPx - 20)}" fill="none" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<path d="M${f(xMid1 + 4)},${f(yFlipBot1 + 4)} L${f(xDoorRightSplit - 4)},${f(yFlipBot1 + hDoorRightPx / 2)} L${f(xMid1 + 4)},${f(yDrawersTop1 - 4)}" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6 3"/>`,
    `<rect x="${f(xDoorRightSplit - 8)}" y="${f(yFlipBot1 + hDoorRightPx / 2 - 25)}" width="3" height="50" rx="1.5" fill="#0f172a"/>`
  );

  // Cánh phải 2
  const xCabRightEdge1 = X1 + Lcab * scale;
  out.push(
    `<rect x="${f(xDoorRightSplit + 4)}" y="${f(yFlipBot1 + 4)}" width="${f(wd2 * scale - 8)}" height="${f(hDoorRightPx - 8)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.2"/>`,
    `<rect x="${f(xDoorRightSplit + 10)}" y="${f(yFlipBot1 + 10)}" width="${f(wd2 * scale - 20)}" height="${f(hDoorRightPx - 20)}" fill="none" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<path d="M${f(xCabRightEdge1 - 4)},${f(yFlipBot1 + 4)} L${f(xDoorRightSplit + 4)},${f(yFlipBot1 + hDoorRightPx / 2)} L${f(xCabRightEdge1 - 4)},${f(yDrawersTop1 - 4)}" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6 3"/>`,
    `<rect x="${f(xDoorRightSplit + 5)}" y="${f(yFlipBot1 + hDoorRightPx / 2 - 25)}" width="3" height="50" rx="1.5" fill="#0f172a"/>`
  );

  out.push(
    `<text x="${f(xMid1 + (W2 * scale) / 2)}" y="${f(yFlipBot1 + hDoorRightPx / 2 - 8)}" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle">2 CÁNH MỞ</text>`,
    `<text x="${f(xMid1 + (W2 * scale) / 2)}" y="${f(yFlipBot1 + hDoorRightPx / 2 + 8)}" font-size="10" fill="#64748b" text-anchor="middle">MÀU TRẮNG</text>`
  );

  // BUỒNG PHẢI DƯỚI: 4 NGĂN KÉO (2 cột x 2 hàng)
  const yDrawerMid1 = yDrawersTop1 + hDrawerRow * scale;
  out.push(
    `<line x1="${f(xMid1)}" y1="${f(yDrawerMid1)}" x2="${f(xCabRightEdge1)}" y2="${f(yDrawerMid1)}" stroke="${LINE}" stroke-width="1.5"/>`,
    `<line x1="${f(xDoorRightSplit)}" y1="${f(yDrawersTop1)}" x2="${f(xDoorRightSplit)}" y2="${f(yBaseTop1)}" stroke="${LINE}" stroke-width="1.5"/>`
  );

  const drawOneDrawer1 = (x: number, y: number, w: number, h: number) => {
    out.push(
      `<rect x="${f(x + 3)}" y="${f(y + 3)}" width="${f(w - 6)}" height="${f(h - 6)}" fill="#fafafa" stroke="${LINE}" stroke-width="1.2"/>`,
      `<rect x="${f(x + 7)}" y="${f(y + 7)}" width="${f(w - 14)}" height="${f(h - 14)}" fill="none" stroke="#94a3b8" stroke-width="0.8"/>`,
      `<rect x="${f(x + w / 2 - 22)}" y="${f(y + h / 2 - 2)}" width="44" height="4" rx="2" fill="#0f172a"/>`,
      `<text x="${f(x + w / 2)}" y="${f(y + h / 2 - 6)}" font-size="9.5" font-weight="bold" fill="#475569" text-anchor="middle">NGĂN KÉO</text>`
    );
  };
  drawOneDrawer1(xMid1, yDrawersTop1, wd2 * scale, hDrawerRow * scale);
  drawOneDrawer1(xDoorRightSplit, yDrawersTop1, wd2 * scale, hDrawerRow * scale);
  drawOneDrawer1(xMid1, yDrawerMid1, wd2 * scale, (yBaseTop1 - yDrawerMid1));
  drawOneDrawer1(xDoorRightSplit, yDrawerMid1, wd2 * scale, (yBaseTop1 - yDrawerMid1));

  // KỆ GÓC BÊN PHẢI (5 đợt hở)
  const xShelfRight1 = X1 + cW;
  out.push(
    `<rect x="${f(xCabRightEdge1)}" y="${f(yTopBot1)}" width="${f(S * scale)}" height="${f((H - hTop - hBase) * scale)}" fill="#fdfdfd" stroke="${LINE}" stroke-width="1.8"/>`
  );
  // 5 đợt kệ ngang
  const shelfSpacing = Math.round((H - hTop - hBase) / 5);
  for (let i = 1; i <= 4; i++) {
    const ySh = yTopBot1 + i * shelfSpacing * scale;
    out.push(
      `<rect x="${f(xCabRightEdge1)}" y="${f(ySh)}" width="${f(S * scale)}" height="${f(T * scale)}" fill="#f1f5f9" stroke="${LINE}" stroke-width="1.4"/>`
    );
  }

  // Tiêu đề Mặt đứng
  out.push(
    `<text x="${f(X1 + cW / 2)}" y="${f(Y1_bottom + 42)}" font-size="16" font-weight="900" fill="${LINE}" text-anchor="middle" letter-spacing="1">MẶT ĐỨNG</text>`,
    `<line x1="${f(X1 + cW / 2 - 60)}" y1="${f(Y1_bottom + 48)}" x2="${f(X1 + cW / 2 + 60)}" y2="${f(Y1_bottom + 48)}" stroke="${LINE}" stroke-width="1.8"/>`
  );

  // Ký hiệu trục cắt 1-1 và A-A
  out.push(
    `<g stroke="${RED}" stroke-width="1.5">`,
    `<line x1="${f(X1 + (W1 * scale) / 2)}" y1="${f(Y1 - 50)}" x2="${f(X1 + (W1 * scale) / 2)}" y2="${f(Y1_bottom + 25)}" stroke-dasharray="12 4 3 4"/>`,
    `<circle cx="${f(X1 + (W1 * scale) / 2)}" cy="${f(Y1 - 50)}" r="10" fill="#ffffff"/>`,
    `<text x="${f(X1 + (W1 * scale) / 2)}" y="${f(Y1 - 46)}" font-size="12" font-weight="bold" fill="${RED}" text-anchor="middle" stroke="none">1</text>`,
    `<line x1="${f(X1 - 25)}" y1="${f(Y1_bottom - (hBase + hDrawers) * scale)}" x2="${f(xShelfRight1 + 25)}" y2="${f(Y1_bottom - (hBase + hDrawers) * scale)}" stroke-dasharray="12 4 3 4"/>`,
    `<circle cx="${f(X1 - 25)}" cy="${f(Y1_bottom - (hBase + hDrawers) * scale)}" r="10" fill="#ffffff"/>`,
    `<text x="${f(X1 - 25)}" y="${f(Y1_bottom - (hBase + hDrawers) * scale + 4)}" font-size="12" font-weight="bold" fill="${RED}" text-anchor="middle" stroke="none">A</text>`,
    `<circle cx="${f(xShelfRight1 + 25)}" cy="${f(Y1_bottom - (hBase + hDrawers) * scale)}" r="10" fill="#ffffff"/>`,
    `<text x="${f(xShelfRight1 + 25)}" y="${f(Y1_bottom - (hBase + hDrawers) * scale + 4)}" font-size="12" font-weight="bold" fill="${RED}" text-anchor="middle" stroke="none">A</text>`,
    `</g>`
  );

  // Đường kích thước Mặt đứng (có cánh)
  // Chuỗi kích thước trên đỉnh (Module)
  dimH(X1, xMid1, Y1, Y1 - 25, W1);
  dimH(xMid1, xCabRightEdge1, Y1, Y1 - 25, W2);
  dimH(xCabRightEdge1, xShelfRight1, Y1, Y1 - 25, S);
  dimH(X1, xShelfRight1, Y1, Y1 - 65, L);

  // Chuỗi kích thước dưới đáy (Chi tiết cánh)
  dimH(X1, xDoorLeftSplit, Y1_bottom, Y1_bottom + 22, wd1);
  dimH(xDoorLeftSplit, xMid1, Y1_bottom, Y1_bottom + 22, wd1);
  dimH(xMid1, xDoorRightSplit, Y1_bottom, Y1_bottom + 22, wd2);
  dimH(xDoorRightSplit, xCabRightEdge1, Y1_bottom, Y1_bottom + 22, wd2);
  dimH(xCabRightEdge1, xShelfRight1, Y1_bottom, Y1_bottom + 22, S);
  dimH(X1, xShelfRight1, Y1_bottom, Y1_bottom + 52, L);

  // Chuỗi kích thước cao độ bên trái
  dimV(Y1, yTopBot1, X1, X1 - 25, hTop);
  dimV(yTopBot1, yFlipBot1, X1, X1 - 25, hFlip);
  dimV(yFlipBot1, yBaseTop1, X1, X1 - 25, hMain);
  dimV(yBaseTop1, Y1_bottom, X1, X1 - 25, hBase);
  dimV(Y1, Y1_bottom, X1, X1 - 65, H);

  // Chuỗi kích thước đợt bên phải
  const shRightY0 = yTopBot1;
  dimV(Y1, yTopBot1, xShelfRight1, xShelfRight1 + 25, hTop);
  for (let i = 0; i < 4; i++) {
    dimV(shRightY0 + i * shelfSpacing * scale, shRightY0 + (i + 1) * shelfSpacing * scale, xShelfRight1, xShelfRight1 + 25, shelfSpacing);
  }
  dimV(shRightY0 + 4 * shelfSpacing * scale, yBaseTop1, xShelfRight1, xShelfRight1 + 25, shelfSpacing);
  dimV(yBaseTop1, Y1_bottom, xShelfRight1, xShelfRight1 + 25, hBase);
  dimV(Y1, Y1_bottom, xShelfRight1, xShelfRight1 + 65, H);

  // ---------------------------------------------------------------------------
  // 2. VẼ MẶT ĐỨNG BỎ CÁNH (KẾT CẤU BÊN TRONG - BÊN PHẢI)
  // ---------------------------------------------------------------------------
  drawGround(X2, Y2_bottom, cW);

  // Len chân đáy
  out.push(
    `<rect x="${f(X2)}" y="${f(Y2_bottom - hBase * scale)}" width="${f(cW)}" height="${f(hBase * scale)}" fill="#f1f5f9" stroke="${LINE}" stroke-width="1.6"/>`
  );

  // Phào nóc
  out.push(
    `<rect x="${f(X2)}" y="${f(Y2)}" width="${f(cW)}" height="${f(hTop * scale)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.8"/>`
  );

  // Thân thùng tủ
  const yInnerTop2 = Y2 + hTop * scale;
  const yInnerBot2 = Y2_bottom - hBase * scale;
  const hInnerTotal2 = yInnerBot2 - yInnerTop2;
  const xCabRightEdge2 = X2 + Lcab * scale;
  const xShelfRight2 = X2 + cW;

  out.push(
    `<rect x="${f(X2)}" y="${f(yInnerTop2)}" width="${f(Lcab * scale)}" height="${f(hInnerTotal2)}" fill="#ffffff" stroke="${LINE}" stroke-width="2.2"/>`
  );

  // Các vách đứng gỗ dày T:
  // 1. Hồi trái ngoài cùng
  out.push(`<rect x="${f(X2)}" y="${f(yInnerTop2)}" width="${f(T * scale)}" height="${f(hInnerTotal2)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`);
  // 2. Vách ngăn giữa 2 buồng
  const xMidVach2 = X2 + W1 * scale - (T / 2) * scale;
  out.push(`<rect x="${f(xMidVach2)}" y="${f(yInnerTop2)}" width="${f(T * scale)}" height="${f(hInnerTotal2)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`);
  // 3. Vách ngăn kệ góc
  out.push(`<rect x="${f(xCabRightEdge2 - T * scale)}" y="${f(yInnerTop2)}" width="${f(T * scale)}" height="${f(hInnerTotal2)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`);
  // 4. Hồi ngoài kệ góc
  out.push(`<rect x="${f(xShelfRight2 - T * scale)}" y="${f(yInnerTop2)}" width="${f(T * scale)}" height="${f(hInnerTotal2)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`);

  // Đợt ngang nóc chia khoang nóc để vali
  const yLuggageDot2 = yInnerTop2 + hLuggage * scale;
  out.push(
    `<rect x="${f(X2 + T * scale)}" y="${f(yLuggageDot2)}" width="${f((W1 - 1.5 * T) * scale)}" height="${f(T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`,
    `<rect x="${f(xMidVach2 + T * scale)}" y="${f(yLuggageDot2)}" width="${f((W2 - 1.5 * T) * scale)}" height="${f(T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`
  );

  // BUỒNG TRÁI:
  // Suốt treo quần áo dài (cao hHanging)
  const yRodLeft2 = yLuggageDot2 + T * scale + 60 * scale;
  const wRodLeft2 = (W1 - 1.5 * T) * scale;
  out.push(
    // Pát đỡ 2 đầu
    `<rect x="${f(X2 + T * scale)}" y="${f(yRodLeft2 - 4)}" width="6" height="18" fill="#475569"/>`,
    `<rect x="${f(xMidVach2 - 6)}" y="${f(yRodLeft2 - 4)}" width="6" height="18" fill="#475569"/>`,
    // Thanh suốt treo Inox
    `<rect x="${f(X2 + T * scale + 6)}" y="${f(yRodLeft2)}" width="${f(wRodLeft2 - 12)}" height="10" rx="3" fill="#94a3b8" stroke="#475569" stroke-width="0.8"/>`,
    `<text x="${f(X2 + T * scale + wRodLeft2 / 2)}" y="${f(yRodLeft2 + 25)}" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle">Thanh treo quần áo</text>`
  );

  // Đợt giữa buồng trái (dưới suốt treo hHanging)
  const yMidDotLeft2 = yLuggageDot2 + T * scale + hHanging * scale;
  out.push(
    `<rect x="${f(X2 + T * scale)}" y="${f(yMidDotLeft2)}" width="${f(wRodLeft2)}" height="${f(T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`
  );

  // Đợt đáy buồng trái (dưới đợt giữa hCompartmentMid)
  const yBotDotLeft2 = yMidDotLeft2 + T * scale + hCompartmentMid * scale;
  out.push(
    `<rect x="${f(X2 + T * scale)}" y="${f(yBotDotLeft2)}" width="${f(wRodLeft2)}" height="${f(T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`
  );

  // BUỒNG PHẢI:
  // Suốt treo quần áo ngắn (cao hHanging)
  const xRodRightStart2 = xMidVach2 + T * scale;
  const wRodRight2 = (W2 - 1.5 * T) * scale;
  out.push(
    `<rect x="${f(xRodRightStart2)}" y="${f(yRodLeft2 - 4)}" width="6" height="18" fill="#475569"/>`,
    `<rect x="${f(xCabRightEdge2 - T * scale - 6)}" y="${f(yRodLeft2 - 4)}" width="6" height="18" fill="#475569"/>`,
    `<rect x="${f(xRodRightStart2 + 6)}" y="${f(yRodLeft2)}" width="${f(wRodRight2 - 12)}" height="10" rx="3" fill="#94a3b8" stroke="#475569" stroke-width="0.8"/>`,
    `<text x="${f(xRodRightStart2 + wRodRight2 / 2)}" y="${f(yRodLeft2 + 25)}" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle">Thanh treo quần áo</text>`
  );

  // Đợt ngang nóc cụm ngăn kéo
  const yDrawersDeck2 = yLuggageDot2 + T * scale + hHanging * scale;
  out.push(
    `<rect x="${f(xRodRightStart2)}" y="${f(yDrawersDeck2)}" width="${f(wRodRight2)}" height="${f(T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`
  );

  // Vách dọc giữa chia 2 cột ngăn kéo
  const hDrawersInternal2 = yInnerBot2 - (yDrawersDeck2 + T * scale);
  const xDrawerMidCol2 = xRodRightStart2 + wRodRight2 / 2 - (T / 2) * scale;
  out.push(
    `<rect x="${f(xDrawerMidCol2)}" y="${f(yDrawersDeck2 + T * scale)}" width="${f(T * scale)}" height="${f(hDrawersInternal2)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`
  );

  // Đợt ngang chia hàng ngăn kéo
  const yDrawerMidRow2 = yDrawersDeck2 + T * scale + hDrawersInternal2 / 2;
  out.push(
    `<rect x="${f(xRodRightStart2)}" y="${f(yDrawerMidRow2)}" width="${f(wRodRight2)}" height="${f(T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.2"/>`
  );

  // Vẽ 4 hộp ngăn kéo chi tiết (với ray trượt bi 2 bên)
  const drawOneInternalDrawer2 = (x: number, y: number, w: number, h: number) => {
    out.push(
      // Ray trượt bi 2 bên
      `<line x1="${f(x)}" y1="${f(y + h / 2)}" x2="${f(x + 5)}" y2="${f(y + h / 2)}" stroke="#64748b" stroke-width="2"/>`,
      `<line x1="${f(x + w - 5)}" y1="${f(y + h / 2)}" x2="${f(x + w)}" y2="${f(y + h / 2)}" stroke="#64748b" stroke-width="2"/>`,
      // Hộp ngăn kéo
      `<rect x="${f(x + 6)}" y="${f(y + 3)}" width="${f(w - 12)}" height="${f(h - 6)}" fill="#f8fafc" stroke="${LINE}" stroke-width="1.4"/>`,
      `<rect x="${f(x + w / 2 - 20)}" y="${f(y + h / 2 - 2)}" width="40" height="4" rx="2" fill="#0f172a"/>`,
      `<text x="${f(x + w / 2)}" y="${f(y + h / 2 - 6)}" font-size="9" font-weight="bold" fill="#334155" text-anchor="middle">NGĂN KÉO</text>`
    );
  };
  const wDrawerBox2 = (wRodRight2 - T * scale) / 2;
  const hDrawerBox2 = (hDrawersInternal2 - T * scale) / 2;
  drawOneInternalDrawer2(xRodRightStart2, yDrawersDeck2 + T * scale, wDrawerBox2, hDrawerBox2);
  drawOneInternalDrawer2(xDrawerMidCol2 + T * scale, yDrawersDeck2 + T * scale, wDrawerBox2, hDrawerBox2);
  drawOneInternalDrawer2(xRodRightStart2, yDrawerMidRow2 + T * scale, wDrawerBox2, hDrawerBox2);
  drawOneInternalDrawer2(xDrawerMidCol2 + T * scale, yDrawerMidRow2 + T * scale, wDrawerBox2, hDrawerBox2);

  // Kệ hở bên phải (5 đợt hở)
  out.push(
    `<rect x="${f(xCabRightEdge2)}" y="${f(yInnerTop2)}" width="${f(S * scale)}" height="${f(hInnerTotal2)}" fill="#fdfdfd" stroke="${LINE}" stroke-width="1.8"/>`
  );
  for (let i = 1; i <= 4; i++) {
    const ySh = yInnerTop2 + i * shelfSpacing * scale;
    out.push(
      `<rect x="${f(xCabRightEdge2)}" y="${f(ySh)}" width="${f(S * scale)}" height="${f(T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1.4"/>`
    );
  }

  // Tiêu đề Mặt đứng bỏ cánh
  out.push(
    `<text x="${f(X2 + cW / 2)}" y="${f(Y2_bottom + 42)}" font-size="16" font-weight="900" fill="${LINE}" text-anchor="middle" letter-spacing="1">MẶT ĐỨNG BỎ CÁNH</text>`,
    `<line x1="${f(X2 + cW / 2 - 90)}" y1="${f(Y2_bottom + 48)}" x2="${f(X2 + cW / 2 + 90)}" y2="${f(Y2_bottom + 48)}" stroke="${LINE}" stroke-width="1.8"/>`
  );

  // Kích thước Mặt đứng bỏ cánh
  // Trên đỉnh
  dimH(X2, X2 + T * scale, Y2, Y2 - 25, T);
  dimH(X2 + T * scale, xMidVach2, Y2, Y2 - 25, Math.round(inW1));
  dimH(xMidVach2, xMidVach2 + T * scale, Y2, Y2 - 25, T);
  dimH(xMidVach2 + T * scale, xCabRightEdge2 - T * scale, Y2, Y2 - 25, Math.round(inW2));
  dimH(xCabRightEdge2 - T * scale, xCabRightEdge2, Y2, Y2 - 25, T);
  dimH(xCabRightEdge2, xShelfRight2, Y2, Y2 - 25, S);
  dimH(X2, xShelfRight2, Y2, Y2 - 65, L);

  // Dưới đáy (kích thước chi tiết ngăn kéo)
  dimH(X2, X2 + T * scale, Y2_bottom, Y2_bottom + 22, T);
  dimH(X2 + T * scale, xMidVach2, Y2_bottom, Y2_bottom + 22, Math.round(inW1));
  dimH(xMidVach2, xMidVach2 + T * scale, Y2_bottom, Y2_bottom + 22, T);
  dimH(xMidVach2 + T * scale, xDrawerMidCol2, Y2_bottom, Y2_bottom + 22, drawerW);
  dimH(xDrawerMidCol2, xDrawerMidCol2 + T * scale, Y2_bottom, Y2_bottom + 22, T);
  dimH(xDrawerMidCol2 + T * scale, xCabRightEdge2 - T * scale, Y2_bottom, Y2_bottom + 22, drawerW);
  dimH(xCabRightEdge2 - T * scale, xCabRightEdge2, Y2_bottom, Y2_bottom + 22, T);
  dimH(xCabRightEdge2, xShelfRight2, Y2_bottom, Y2_bottom + 22, S);
  dimH(X2, xShelfRight2, Y2_bottom, Y2_bottom + 52, L);

  // Cao độ khoang bên trái của hình bỏ cánh
  dimV(Y2, yInnerTop2, X2, X2 - 25, hTop);
  dimV(yInnerTop2, yLuggageDot2, X2, X2 - 25, hLuggage);
  dimV(yLuggageDot2, yLuggageDot2 + T * scale, X2, X2 - 25, T);
  dimV(yLuggageDot2 + T * scale, yMidDotLeft2, X2, X2 - 25, hHanging);
  dimV(yMidDotLeft2, yMidDotLeft2 + T * scale, X2, X2 - 25, T);
  dimV(yMidDotLeft2 + T * scale, yBotDotLeft2, X2, X2 - 25, hCompartmentMid);
  dimV(yBotDotLeft2, yBotDotLeft2 + T * scale, X2, X2 - 25, T);
  dimV(yBotDotLeft2 + T * scale, yInnerBot2, X2, X2 - 25, hCompartmentBot);
  dimV(yInnerBot2, Y2_bottom, X2, X2 - 25, hBase);
  dimV(Y2, Y2_bottom, X2, X2 - 65, H);

  // ---------------------------------------------------------------------------
  // 3. MẶT BẰNG CẮT A-A (PHÍA DƯỚI BÊN TRÁI)
  // ---------------------------------------------------------------------------
  const X_plan = X1;
  const Y_plan = 1080;
  const H_plan = D * scale;

  out.push(
    // Khung bao mặt bằng
    `<rect x="${f(X_plan)}" y="${f(Y_plan)}" width="${f(cW)}" height="${f(H_plan)}" fill="#ffffff" stroke="${LINE}" stroke-width="2"/>`,
    // Tấm hậu tủ phía sau
    `<rect x="${f(X_plan)}" y="${f(Y_plan)}" width="${f(cW)}" height="${f(T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1"/>`,
    // Vách hồi trái
    `<rect x="${f(X_plan)}" y="${f(Y_plan + T * scale)}" width="${f(T * scale)}" height="${f(H_plan - T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1"/>`,
    // Vách giữa
    `<rect x="${f(X_plan + W1 * scale - (T / 2) * scale)}" y="${f(Y_plan + T * scale)}" width="${f(T * scale)}" height="${f(H_plan - T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1"/>`,
    // Vách ngăn kệ góc
    `<rect x="${f(X_plan + Lcab * scale - T * scale)}" y="${f(Y_plan + T * scale)}" width="${f(T * scale)}" height="${f(H_plan - T * scale)}" fill="#cbd5e1" stroke="${LINE}" stroke-width="1"/>`,
    // Đường cong bo góc kệ ngoài bên phải
    `<path d="M${f(X_plan + Lcab * scale)},${f(Y_plan + H_plan)} Q${f(X_plan + cW)},${f(Y_plan + H_plan)} ${f(X_plan + cW)},${f(Y_plan)}" fill="none" stroke="${LINE}" stroke-width="1.8"/>`,
    // Thanh suốt treo Inox cắt tròn
    `<circle cx="${f(X_plan + (W1 * scale) / 2)}" cy="${f(Y_plan + H_plan / 2)}" r="6" fill="#94a3b8" stroke="#0f172a" stroke-width="1.2"/>`,
    `<circle cx="${f(X_plan + W1 * scale + (W2 * scale) / 2)}" cy="${f(Y_plan + H_plan / 2)}" r="6" fill="#94a3b8" stroke="#0f172a" stroke-width="1.2"/>`,
    // Kích thước chiều sâu
    `<text x="${f(X_plan + cW / 2)}" y="${f(Y_plan + H_plan + 35)}" font-size="14" font-weight="bold" fill="${LINE}" text-anchor="middle">MẶT BẰNG CẮT A-A</text>`
  );
  dimV(Y_plan, Y_plan + H_plan, X_plan, X_plan - 25, D);
  dimH(X_plan, X_plan + cW, Y_plan + H_plan, Y_plan + H_plan + 15, L);

  // ---------------------------------------------------------------------------
  // 4. KHUNG TÊN BẢN VẼ TIÊU CHUẨN XƯỞNG CNC (PHÍA DƯỚI BÊN PHẢI)
  // ---------------------------------------------------------------------------
  const X_tb = X2;
  const Y_tb = 1080;
  const W_tb = cW;
  const H_tb = 190;

  out.push(
    `<rect x="${f(X_tb)}" y="${f(Y_tb)}" width="${f(W_tb)}" height="${f(H_tb)}" fill="#f8fafc" stroke="${LINE}" stroke-width="2"/>`,
    // Header
    `<rect x="${f(X_tb)}" y="${f(Y_tb)}" width="${f(W_tb)}" height="38" fill="#0f2a5c"/>`,
    `<text x="${f(X_tb + 15)}" y="${f(Y_tb + 24)}" font-size="14" font-weight="900" fill="#ffffff" letter-spacing="1">XƯỞNG CƠ KHÍ &amp; GIA CÔNG NỘI THẤT CNC</text>`,
    `<text x="${f(X_tb + W_tb - 15)}" y="${f(Y_tb + 24)}" font-size="12" font-weight="bold" fill="#38bdf8" text-anchor="end">TIÊU CHUẨN ISO 9001</text>`,
    // Tên bản vẽ
    `<text x="${f(X_tb + 15)}" y="${f(Y_tb + 65)}" font-size="16" font-weight="900" fill="#0f172a">BẢN VẼ THI CÔNG: ${esc(spec.title.toUpperCase())}</text>`,
    // Bảng thông số kỹ thuật 2 cột
    `<text x="${f(X_tb + 15)}" y="${f(Y_tb + 95)}" font-size="12" fill="#334155"><tspan font-weight="bold">Quy cách tổng thể:</tspan> Dài ${L} × Sâu ${D} × Cao ${H} mm (Ván dày ${T}mm)</text>`,
    `<text x="${f(X_tb + 15)}" y="${f(Y_tb + 120)}" font-size="12" fill="#334155"><tspan font-weight="bold">Vật liệu kết cấu:</tspan> ${esc(spec.material)}</text>`,
    `<text x="${f(X_tb + 15)}" y="${f(Y_tb + 145)}" font-size="12" fill="#334155"><tspan font-weight="bold">Bề mặt hoàn thiện:</tspan> ${esc(spec.finish)}</text>`,
    `<text x="${f(X_tb + 15)}" y="${f(Y_tb + 170)}" font-size="12" fill="#334155"><tspan font-weight="bold">Phụ kiện kèm theo:</tspan> 2 Suốt treo Inox oval 25mm + 4 Bộ ray trượt bi 3 tầng + Bản lề 304</text>`,
    // Cột phải khung tên
    `<line x1="${f(X_tb + W_tb - 220)}" y1="${f(Y_tb + 38)}" x2="${f(X_tb + W_tb - 220)}" y2="${f(Y_tb + H_tb)}" stroke="${LINE}" stroke-width="1.2"/>`,
    `<text x="${f(X_tb + W_tb - 205)}" y="${f(Y_tb + 65)}" font-size="12" fill="#475569">Mã bản vẽ: <tspan font-weight="bold" fill="#0369a1">${meta.code}</tspan></text>`,
    `<text x="${f(X_tb + W_tb - 205)}" y="${f(Y_tb + 95)}" font-size="12" fill="#475569">Ngày lập: <tspan font-weight="bold">${meta.date}</tspan></text>`,
    `<text x="${f(X_tb + W_tb - 205)}" y="${f(Y_tb + 125)}" font-size="12" fill="#475569">Tỷ lệ: <tspan font-weight="bold">1:20 (NTS)</tspan></text>`,
    `<text x="${f(X_tb + W_tb - 205)}" y="${f(Y_tb + 155)}" font-size="12" fill="#475569">Dung sai: <tspan font-weight="bold">±0.03 mm</tspan></text>`,
    `</svg>`
  );

  return out.join("\n");
}

// ---------------------------------------------------------------------------
// RENDER DXF TỦ QUẦN ÁO TƯƠNG THÍCH AUTOCAD
// (Xuất 2 mặt đứng + Mặt bằng chuẩn các Layer AutoCAD)
// ---------------------------------------------------------------------------

function renderWardrobeDxf(spec: CadSpec): string {
  const { W: rawW, H: rawH, D: rawD } = bounds(spec);
  const L = Math.max(1200, Math.round(rawW || 2115));
  const H = Math.max(1500, Math.round(rawH || 2650));
  const D = Math.max(400, Math.round(rawD || 600));

  // Trích xuất độ dày vách T từ thông số hoặc parts
  let detectedT = 20;
  const matchT =
    (spec.title || "").match(/T=(\d+(?:\.\d+)?)/i) ||
    (spec.assumptions?.[0] || "").match(/Dày (\d+(?:\.\d+)?)/i);
  if (matchT) {
    detectedT = parseFloat(matchT[1]);
  } else {
    const thinParts = (spec.parts || []).filter((p) => p.w <= 35 || p.h <= 35 || p.d <= 35);
    if (thinParts.length > 0) {
      detectedT = Math.round(
        thinParts[0].w <= 35 ? thinParts[0].w : thinParts[0].h <= 35 ? thinParts[0].h : thinParts[0].d
      );
    }
  }
  const T = Math.max(12, Math.min(40, Math.round(detectedT || 20)));

  const S = Math.max(200, Math.min(500, Math.round(L * (300 / 2115))));
  const Lcab = L - S;
  const W1 = Math.round(Lcab / 2);
  const W2 = Lcab - W1;
  const wd1 = Math.round(W1 / 2);
  const wd2 = Math.round(W2 / 2);

  const inW1 = W1 - 1.5 * T;
  const inW2 = W2 - 1.5 * T;
  const drawerW = Math.round((inW2 - T) / 2);

  const hTop = Math.max(60, Math.min(140, Math.round(H * (100 / 2650))));
  const hPlinth = Math.max(40, Math.min(80, Math.round(H * (50 / 2650))));
  const hBase = hPlinth + T; // 70mm
  const hAvail = H - hTop - hBase;
  const hLuggage = Math.max(250, Math.min(500, Math.round(hAvail * (370 / 2480))));
  const hMainBody = hAvail - hLuggage - T;
  const hHanging = Math.max(800, Math.min(1500, Math.round(hMainBody * (1280 / 2090))));
  const hLower = hMainBody - hHanging - 2 * T;
  const hCompartmentMid = Math.max(150, Math.round(hLower * (300 / 770)));
  const hCompartmentBot = hLower - hCompartmentMid;

  const hFlip = hLuggage + T;
  const hMain = hMainBody + 2 * T;
  const hDrawers = hCompartmentMid + hCompartmentBot + 2 * T;
  const hRdoor = hMain - hDrawers;
  const hDrawerRow = Math.round(hDrawers / 2);

  const out: string[] = ["0", "SECTION", "2", "ENTITIES"];
  const n = (v: number) => (Math.round(v * 1000) / 1000).toString();

  const line = (layer: string, x1: number, y1: number, x2: number, y2: number) =>
    out.push("0", "LINE", "8", layer, "10", n(x1), "20", n(y1), "30", "0", "11", n(x2), "21", n(y2), "31", "0");
  const rect = (layer: string, x: number, y: number, w: number, h: number) => {
    line(layer, x, y, x + w, y);
    line(layer, x + w, y, x + w, y + h);
    line(layer, x + w, y + h, x, y + h);
    line(layer, x, y + h, x, y);
  };
  const text = (layer: string, x: number, y: number, h: number, s: string) =>
    out.push("0", "TEXT", "8", layer, "10", n(x), "20", n(y), "30", "0", "40", n(h), "1", toAscii(s));

  const dimH = (layer: string, x1: number, x2: number, y: number, label: string | number) => {
    const lbl = String(label);
    line(layer, x1, y, x2, y);
    line(layer, x1, y - 15, x1, y + 15);
    line(layer, x2, y - 15, x2, y + 15);
    text(layer, (x1 + x2) / 2 - lbl.length * 8, y + 15, 25, lbl);
  };

  const dimV = (layer: string, y1: number, y2: number, x: number, label: string | number) => {
    const lbl = String(label);
    line(layer, x, y1, x, y2);
    line(layer, x - 15, y1, x + 15, y1);
    line(layer, x - 15, y2, x + 15, y2);
    text(layer, x - 50, (y1 + y2) / 2, 25, lbl);
  };

  // 1. ELEVATION 1: MẶT ĐỨNG CÓ CÁNH tại X: 0 -> L, Y: 0 -> H
  rect("ELEV_DOORS", 0, 0, L, H);
  rect("ELEV_DOORS", 0, 0, L, hBase);
  rect("ELEV_DOORS", 0, H - hTop, L, hTop);

  // Cánh lật nóc
  rect("ELEV_DOORS", 0, H - hTop - hFlip, W1, hFlip);
  rect("ELEV_DOORS", W1, H - hTop - hFlip, W2, hFlip);
  text("TEXT", W1 / 2 - 50, H - hTop - hFlip / 2, 28, "CANH LAT");
  text("TEXT", W1 + W2 / 2 - 50, H - hTop - hFlip / 2, 28, "CANH LAT");

  // Buồng trái 2 cánh mở suốt
  rect("ELEV_DOORS", 0, hBase, wd1, hMain);
  rect("ELEV_DOORS", wd1, hBase, wd1, hMain);
  line("ELEV_SWING", 0, hBase, wd1, hBase + hMain / 2);
  line("ELEV_SWING", 0, hBase + hMain, wd1, hBase + hMain / 2);
  line("ELEV_SWING", W1, hBase, wd1, hBase + hMain / 2);
  line("ELEV_SWING", W1, hBase + hMain, wd1, hBase + hMain / 2);
  text("TEXT", W1 / 2 - 80, hBase + hMain / 2 - 20, 26, "2 CANH MO MAU TRANG");

  // Buồng phải cánh mở ngắn
  rect("ELEV_DOORS", W1, hBase + hDrawers, wd2, hRdoor);
  rect("ELEV_DOORS", W1 + wd2, hBase + hDrawers, wd2, hRdoor);
  line("ELEV_SWING", W1, hBase + hDrawers, W1 + wd2, hBase + hDrawers + hRdoor / 2);
  line("ELEV_SWING", W1, hBase + hDrawers + hRdoor, W1 + wd2, hBase + hDrawers + hRdoor / 2);
  line("ELEV_SWING", Lcab, hBase + hDrawers, W1 + wd2, hBase + hDrawers + hRdoor / 2);
  line("ELEV_SWING", Lcab, hBase + hDrawers + hRdoor, W1 + wd2, hBase + hDrawers + hRdoor / 2);
  text("TEXT", W1 + W2 / 2 - 80, hBase + hDrawers + hRdoor / 2 - 20, 26, "2 CANH MO MAU TRANG");

  // Buồng phải: 4 ngăn kéo
  rect("ELEV_DOORS", W1, hBase, wd2, hDrawerRow);
  rect("ELEV_DOORS", W1 + wd2, hBase, wd2, hDrawerRow);
  rect("ELEV_DOORS", W1, hBase + hDrawerRow, wd2, hDrawerRow);
  rect("ELEV_DOORS", W1 + wd2, hBase + hDrawerRow, wd2, hDrawerRow);
  text("TEXT", W1 + wd2 / 2 - 40, hBase + hDrawerRow / 2, 20, "NGAN KEO");
  text("TEXT", W1 + wd2 + wd2 / 2 - 40, hBase + hDrawerRow / 2, 20, "NGAN KEO");
  text("TEXT", W1 + wd2 / 2 - 40, hBase + hDrawerRow + hDrawerRow / 2, 20, "NGAN KEO");
  text("TEXT", W1 + wd2 + wd2 / 2 - 40, hBase + hDrawerRow + hDrawerRow / 2, 20, "NGAN KEO");

  // Kệ hở bên phải: 5 đợt
  const shelfGap = Math.round((H - hTop - hBase) / 5);
  for (let i = 1; i <= 5; i++) {
    rect("ELEV_DOORS", Lcab, hBase + i * shelfGap, S, 20);
  }

  text("TITLE", L / 2 - 80, -120, 45, "MAT DUNG");

  // Đường kích thước Mặt đứng
  dimH("DIMS", 0, W1, H + 60, W1);
  dimH("DIMS", W1, Lcab, H + 60, W2);
  dimH("DIMS", Lcab, L, H + 60, S);
  dimH("DIMS", 0, L, H + 140, L);

  dimH("DIMS", 0, wd1, -60, wd1);
  dimH("DIMS", wd1, W1, -60, wd1);
  dimH("DIMS", W1, W1 + wd2, -60, wd2);
  dimH("DIMS", W1 + wd2, Lcab, -60, wd2);
  dimH("DIMS", Lcab, L, -60, S);

  dimV("DIMS", 0, hBase, -60, hBase);
  dimV("DIMS", hBase, hBase + hMain, -60, hMain);
  dimV("DIMS", hBase + hMain, H - hTop, -60, hFlip);
  dimV("DIMS", H - hTop, H, -60, hTop);
  dimV("DIMS", 0, H, -140, H);

  // 2. ELEVATION 2: MẶT ĐỨNG BỎ CÁNH tại X: L + 500
  const OX = L + 500;
  rect("ELEV_INTERIOR", OX, 0, L, H);
  rect("ELEV_INTERIOR", OX, 0, L, 70);
  rect("ELEV_INTERIOR", OX, H - hTop, L, hTop);

  // Vách hồi & đợt
  rect("ELEV_INTERIOR", OX, 70, T, H - hTop - 70);
  rect("ELEV_INTERIOR", OX + W1 - T / 2, 70, T, H - hTop - 70);
  rect("ELEV_INTERIOR", OX + Lcab - T, 70, T, H - hTop - 70);
  rect("ELEV_INTERIOR", OX + L - T, 70, T, H - hTop - 70);

  // Đợt nóc
  rect("ELEV_INTERIOR", OX, H - hTop - hFlip, Lcab, T);

  // Buồng trái: suốt treo và đợt
  const inTopY = H - hTop - hFlip;
  const rodY1 = inTopY - 70;
  rect("ELEV_INTERIOR", OX + T, rodY1, W1 - 1.5 * T, 25);
  text("TEXT", OX + T + 50, rodY1 - 35, 25, "Thanh treo quan ao");
  rect("ELEV_INTERIOR", OX + T, 70 + 470 + T + 300, W1 - 1.5 * T, T);
  rect("ELEV_INTERIOR", OX + T, 70 + 470, W1 - 1.5 * T, T);

  // Buồng phải: suốt treo và ngăn kéo
  const rodY2 = inTopY - 70;
  rect("ELEV_INTERIOR", OX + W1 + T / 2, rodY2, W2 - 1.5 * T, 25);
  text("TEXT", OX + W1 + T / 2 + 50, rodY2 - 35, 25, "Thanh treo quan ao");
  rect("ELEV_INTERIOR", OX + W1 + T / 2, 70 + hDrawers, W2 - 1.5 * T, T);
  rect("ELEV_INTERIOR", OX + W1 + T / 2 + (W2 - 1.5 * T) / 2 - T / 2, 70, T, hDrawers);
  rect("ELEV_INTERIOR", OX + W1 + T / 2, 70 + hDrawerRow, W2 - 1.5 * T, T);

  // 4 Ngăn kéo bên trong
  rect("ELEV_INTERIOR", OX + W1 + T / 2 + 5, 75, drawerW - 10, hDrawerRow - 10);
  rect("ELEV_INTERIOR", OX + W1 + T / 2 + drawerW + 5, 75, drawerW - 10, hDrawerRow - 10);
  rect("ELEV_INTERIOR", OX + W1 + T / 2 + 5, 75 + hDrawerRow, drawerW - 10, hDrawerRow - 10);
  rect("ELEV_INTERIOR", OX + W1 + T / 2 + drawerW + 5, 75 + hDrawerRow, drawerW - 10, hDrawerRow - 10);
  text("TEXT", OX + W1 + T / 2 + 40, 70 + hDrawerRow / 2, 20, "NGAN KEO");
  text("TEXT", OX + W1 + T / 2 + (W2 - 1.5 * T) / 2 + 40, 70 + hDrawerRow / 2, 20, "NGAN KEO");
  text("TEXT", OX + W1 + T / 2 + 40, 70 + hDrawerRow + hDrawerRow / 2, 20, "NGAN KEO");
  text("TEXT", OX + W1 + T / 2 + (W2 - 1.5 * T) / 2 + 40, 70 + hDrawerRow + hDrawerRow / 2, 20, "NGAN KEO");

  // Kệ hở
  for (let i = 1; i <= 5; i++) {
    rect("ELEV_INTERIOR", OX + Lcab, 70 + i * shelfGap, S, 20);
  }

  text("TITLE", OX + L / 2 - 140, -120, 45, "MAT DUNG BO CANH");

  // Kích thước bỏ cánh
  dimH("DIMS", OX, OX + T, H + 60, T);
  dimH("DIMS", OX + T, OX + W1 - T / 2, H + 60, Math.round(inW1));
  dimH("DIMS", OX + W1 - T / 2, OX + W1 + T / 2, H + 60, T);
  dimH("DIMS", OX + W1 + T / 2, OX + Lcab - T, H + 60, Math.round(inW2));
  dimH("DIMS", OX + Lcab - T, OX + Lcab, H + 60, T);
  dimH("DIMS", OX + Lcab, OX + L, H + 60, S);
  dimH("DIMS", OX, OX + L, H + 140, L);

  dimV("DIMS", 0, hBase, OX - 60, hBase);
  dimV("DIMS", hBase, hBase + hCompartmentBot, OX - 60, hCompartmentBot);
  dimV("DIMS", hBase + hCompartmentBot, hBase + hCompartmentBot + T, OX - 60, T);
  dimV("DIMS", hBase + hCompartmentBot + T, hBase + hCompartmentBot + T + hCompartmentMid, OX - 60, hCompartmentMid);
  dimV("DIMS", hBase + hCompartmentBot + T + hCompartmentMid, hBase + hCompartmentBot + 2 * T + hCompartmentMid, OX - 60, T);
  dimV("DIMS", hBase + hCompartmentBot + 2 * T + hCompartmentMid, inTopY, OX - 60, hHanging);
  dimV("DIMS", inTopY, inTopY + T, OX - 60, T);
  dimV("DIMS", inTopY + T, H - hTop, OX - 60, hLuggage);
  dimV("DIMS", H - hTop, H, OX - 60, hTop);

  // 3. MẶT BẰNG CẮT A-A tại Y: -D - 400
  const OY_plan = -D - 400;
  rect("PLAN_AA", 0, OY_plan, L, D);
  rect("PLAN_AA", 0, OY_plan, L, T); // hậu
  rect("PLAN_AA", 0, OY_plan + T, T, D - T); // hồi trái
  rect("PLAN_AA", W1 - T / 2, OY_plan + T, T, D - T); // vách giữa
  rect("PLAN_AA", Lcab - T, OY_plan + T, T, D - T); // vách kệ
  dimH("DIMS", 0, L, OY_plan - 50, L);
  dimV("DIMS", OY_plan, OY_plan + D, -50, D);
  text("TITLE", L / 2 - 90, OY_plan - 110, 40, "MAT BANG CAT A-A");

  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}

export function renderSvg(spec: CadSpec, meta: { date: string; code: string }): string {
  if (isWardrobeSpec(spec)) {
    return renderWardrobeSvg(spec, meta);
  }
  if (isStrutBracketSpec(spec)) {
    return renderStrutBracketSvg(spec, meta);
  }
  const { W, H, D } = bounds(spec);
  const PW = 1600;
  const PH = 1130;
  const LINE = "#0f172a";
  const DIM = "#1d4ed8";
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" font-family="Arial, Helvetica, sans-serif">`,
    `<defs><marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="${DIM}"/></marker>`,
    `<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20,0 L0,0 0,20" fill="none" stroke="#eef2f7" stroke-width="1"/></pattern></defs>`,
    `<rect width="${PW}" height="${PH}" fill="#ffffff"/>`,
    `<rect x="40" y="40" width="${PW - 80}" height="${PH - 80}" fill="url(#grid)"/>`,
    `<rect x="20" y="20" width="${PW - 40}" height="${PH - 40}" fill="none" stroke="${LINE}" stroke-width="1"/>`,
    `<rect x="40" y="40" width="${PW - 80}" height="${PH - 80}" fill="none" stroke="${LINE}" stroke-width="2.5"/>`
  );

  const dimH = (x1: number, x2: number, yFrom: number, yDim: number, label: string) => {
    const dir = yDim > yFrom ? 1 : -1;
    out.push(
      `<path d="M${f(x1)},${f(yFrom + 3 * dir)}V${f(yDim + 6 * dir)}M${f(x2)},${f(yFrom + 3 * dir)}V${f(yDim + 6 * dir)}" stroke="${DIM}" stroke-width="0.8" fill="none"/>`,
      `<line x1="${f(x1)}" y1="${f(yDim)}" x2="${f(x2)}" y2="${f(yDim)}" stroke="${DIM}" stroke-width="1" marker-start="url(#ar)" marker-end="url(#ar)"/>`
    );
    if (Math.abs(x2 - x1) >= 14)
      out.push(`<text x="${f((x1 + x2) / 2)}" y="${f(yDim - 5)}" font-size="14" fill="${DIM}" text-anchor="middle">${label}</text>`);
  };

  const dimV = (y1: number, y2: number, xFrom: number, xDim: number, label: string) => {
    const dir = xDim > xFrom ? 1 : -1;
    out.push(
      `<path d="M${f(xFrom + 3 * dir)},${f(y1)}H${f(xDim + 6 * dir)}M${f(xFrom + 3 * dir)},${f(y2)}H${f(xDim + 6 * dir)}" stroke="${DIM}" stroke-width="0.8" fill="none"/>`,
      `<line x1="${f(xDim)}" y1="${f(y1)}" x2="${f(xDim)}" y2="${f(y2)}" stroke="${DIM}" stroke-width="1" marker-start="url(#ar)" marker-end="url(#ar)"/>`
    );
    if (Math.abs(y2 - y1) >= 14) {
      const cx = xDim - 5;
      const cy = (y1 + y2) / 2;
      out.push(
        `<text x="${f(cx)}" y="${f(cy)}" font-size="14" fill="${DIM}" text-anchor="middle" transform="rotate(-90 ${f(cx)} ${f(cy)})">${label}</text>`
      );
    }
  };

  const rect = (x: number, y: number, w: number, h: number) =>
    out.push(
      `<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(w, 0.8))}" height="${f(Math.max(h, 0.8))}" fill="#ffffff" stroke="${LINE}" stroke-width="1.6"/>`
    );

  const triangle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
    out.push(
      `<polygon points="${f(x1)},${f(y1)} ${f(x2)},${f(y2)} ${f(x3)},${f(y3)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round"/>`
    );

  const hole = (cx: number, cy: number, r: number) => {
    const rr = Math.max(r, 1.8);
    const e = rr + 5;
    out.push(
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" fill="#ffffff" stroke="${LINE}" stroke-width="1.2"/>`,
      `<path d="M${f(cx - e)},${f(cy)}H${f(cx + e)}M${f(cx)},${f(cy - e)}V${f(cy + e)}" stroke="#dc2626" stroke-width="0.6" stroke-dasharray="4 2"/>`
    );
  };

  const label = (x: number, y: number, text: string) =>
    out.push(`<text x="${f(x)}" y="${f(y)}" font-size="13" font-weight="bold" fill="${LINE}" letter-spacing="0.5">${esc(text)}</text>`);

  // ---------------- 3 hình chiếu vuông góc (phương pháp góc chiếu thứ 3) ----------------
  const AX0 = 60;
  const AY0 = 60;
  const AW = 940;
  const AH = 1000;
  const gap = 100;
  const s = Math.min((AW - 90 - gap - 80) / (W + D), (AH - 40 - gap - 90) / (H + D));

  const fx0 = AX0 + 90;
  const tTop = AY0 + 40;
  const tBottom = tTop + D * s;
  const fTop = tBottom + gap;
  const fBottom = fTop + H * s;
  const sx0 = fx0 + W * s + gap;

  // Hình chiếu bằng (nhìn từ trên xuống): ngang = x, dọc = z (z=0 sát hình chiếu đứng)
  label(fx0, tTop - 14, "HÌNH CHIẾU BẰNG");
  for (const p of [...spec.parts].sort((a, b) => a.y + a.h - (b.y + b.h)))
    rect(fx0 + p.x * s, tBottom - (p.z + p.d) * s, p.w * s, p.d * s);
  for (const h of spec.holes.filter((h) => h.axis === "y")) hole(fx0 + h.x * s, tBottom - h.z * s, (h.diameter / 2) * s);
  dimV(tTop, tBottom, fx0, fx0 - 45, mm(D));

  // Hình chiếu đứng (nhìn từ trước): ngang = x, dọc = y
  label(fx0, fTop - 14, "HÌNH CHIẾU ĐỨNG");
  for (const p of [...spec.parts].sort((a, b) => b.z - a.z)) {
    if (isTriangularPart(p)) {
      const x1 = fx0 + p.x * s;
      const y1 = fBottom - (p.y + p.h) * s;
      const x2 = fx0 + (p.x + p.w) * s;
      const y2 = fBottom - (p.y + p.h) * s;
      const x3 = fx0 + p.x * s;
      const y3 = fBottom - p.y * s;
      triangle(x1, y1, x2, y2, x3, y3);
    } else {
      rect(fx0 + p.x * s, fBottom - (p.y + p.h) * s, p.w * s, p.h * s);
    }
  }
  for (const h of spec.holes.filter((h) => h.axis === "z")) hole(fx0 + h.x * s, fBottom - h.y * s, (h.diameter / 2) * s);
  dimH(fx0, fx0 + W * s, fBottom, fBottom + 45, mm(W));
  dimV(fTop, fBottom, fx0, fx0 - 45, mm(H));

  // Hình chiếu cạnh (nhìn từ phải): ngang = z (mặt trước bên trái), dọc = y
  label(sx0, fTop - 14, "HÌNH CHIẾU CẠNH");
  for (const p of [...spec.parts].sort((a, b) => a.x + a.w - (b.x + b.w)))
    rect(sx0 + p.z * s, fBottom - (p.y + p.h) * s, p.d * s, p.h * s);
  for (const h of spec.holes.filter((h) => h.axis === "x")) hole(sx0 + h.z * s, fBottom - h.y * s, (h.diameter / 2) * s);
  dimH(sx0, sx0 + D * s, fBottom, fBottom + 45, mm(D));

  // Chuỗi kích thước các tầng (khoảng cách giữa các chi tiết nằm ngang lớn: đợt kệ, mặt bàn...)
  const levelSet = new Set<number>([0, Math.round(H * 10) / 10]);
  for (const p of spec.parts)
    if (p.w >= W * 0.5 && p.h < H * 0.5) {
      levelSet.add(Math.round(p.y * 10) / 10);
      levelSet.add(Math.round((p.y + p.h) * 10) / 10);
    }
  const levels = [...levelSet].sort((a, b) => a - b).filter((v, i, arr) => i === 0 || v - arr[i - 1] >= 1);
  if (levels.length > 2 && levels.length <= 14) {
    const xd = sx0 + D * s + 40;
    for (let i = 1; i < levels.length; i++)
      dimV(fBottom - levels[i] * s, fBottom - levels[i - 1] * s, sx0 + D * s, xd, mm(levels[i] - levels[i - 1]));
  }

  // ---------------- Hình chiếu trục đo ----------------
  const IX0 = 1040;
  const IY0 = 60;
  const IW = 500;
  const IH = 440;
  label(IX0, IY0 + 26, "HÌNH CHIẾU TRỤC ĐO");
  const proj = (x: number, y: number, z: number) => [(x + z) / Math.SQRT2, (x - 2 * y - z) / Math.sqrt(6)] as const;
  const corners = [0, W].flatMap((x) => [0, H].flatMap((y) => [0, D].map((z) => proj(x, y, z))));
  const umin = Math.min(...corners.map((c) => c[0]));
  const umax = Math.max(...corners.map((c) => c[0]));
  const vmin = Math.min(...corners.map((c) => c[1]));
  const vmax = Math.max(...corners.map((c) => c[1]));
  const si = Math.min((IW - 40) / Math.max(umax - umin, 1), (IH - 70) / Math.max(vmax - vmin, 1));
  const ox = IX0 + 20 + (IW - 40 - (umax - umin) * si) / 2;
  const oy = IY0 + 50 + (IH - 70 - (vmax - vmin) * si) / 2;
  const P = (x: number, y: number, z: number) => {
    const [u, v] = proj(x, y, z);
    return `${f(ox + (u - umin) * si)},${f(oy + (v - vmin) * si)}`;
  };
  const dark = /đen|black/i.test(`${spec.finish} ${spec.material}`);
  const palette = (p: CadPart): [string, string, string, string] => {
    if (/gỗ|wood|mdf|ván/i.test(p.name)) return ["#ecd2a6", "#d6ab72", "#b88852", "#5b3a1a"];
    if (dark) return ["#6b7280", "#4b5563", "#374151", "#d1d5db"];
    return ["#f1f5f9", "#cbd5e1", "#94a3b8", "#0f172a"];
  };
  const isoSorted = [...spec.parts].sort(
    (a, b) => a.x + a.w / 2 + a.y + a.h / 2 - (a.z + a.d / 2) - (b.x + b.w / 2 + b.y + b.h / 2 - (b.z + b.d / 2))
  );
  for (const p of isoSorted) {
    const [cTop, cFront, cRight, stroke] = palette(p);
    const x0 = p.x, x1 = p.x + p.w, y0 = p.y, y1 = p.y + p.h, z0 = p.z, z1 = p.z + p.d;
    const poly = (pts: string[], fill: string) =>
      out.push(`<polygon points="${pts.join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="0.9" stroke-linejoin="round"/>`);

    if (isTriangularPart(p)) {
      // Khối nêm tam giác trục đo 3D (Triangular gusset 3D wedge)
      poly([P(x0, y1, z0), P(x1, y1, z0), P(x0, y0, z0)], cFront);
      poly([P(x0, y1, z1), P(x1, y1, z1), P(x0, y0, z1)], cFront);
      poly([P(x0, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y0, z1)], cRight);
      poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], cTop);
    } else {
      poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], cTop);
      poly([P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y0, z0)], cFront);
      poly([P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0)], cRight);
    }
  }

  // Vẽ các lỗ kỹ thuật trực quan trên hình chiếu trục đo
  for (const h of spec.holes) {
    const pt = P(h.x, h.y, h.z);
    const [cxStr, cyStr] = pt.split(",");
    const cx = parseFloat(cxStr);
    const cy = parseFloat(cyStr);
    const hr = Math.max((h.diameter / 2) * si * 0.75, 1.8);
    out.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(hr)}" ry="${f(hr * 0.6)}" fill="#1e293b" stroke="#94a3b8" stroke-width="0.8"/>`);
  }

  // ---------------- Bảng kê chi tiết ----------------
  const BX = 1040;
  const BY = 520;
  const cols = [BX, BX + 40, BX + 270, BX + 310, BX + 520];
  label(BX, BY + 14, "BẢNG KÊ CHI TIẾT");
  const groups = new Map<string, { name: string; qty: number; size: string }>();
  for (const p of spec.parts) {
    const size = `${mm(p.w)} × ${mm(p.d)} × ${mm(p.h)}`;
    const key = `${p.name}|${size}`;
    const g = groups.get(key);
    if (g) g.qty++;
    else groups.set(key, { name: p.name, qty: 1, size });
  }
  const rows = [...groups.values()];
  const shown = rows.slice(0, 10);
  const rowH = 23;
  let y = BY + 24;
  const cell = (x: number, yy: number, text: string, anchor = "start", bold = false) =>
    out.push(
      `<text x="${f(x)}" y="${f(yy)}" font-size="12" fill="${LINE}" text-anchor="${anchor}"${bold ? ' font-weight="bold"' : ""}>${esc(text)}</text>`
    );
  const tableRows = shown.length + 1 + (rows.length > shown.length ? 1 : 0);
  out.push(
    `<rect x="${BX}" y="${y}" width="${cols[4] - BX}" height="${tableRows * rowH}" fill="#ffffff" stroke="${LINE}" stroke-width="1.2"/>`
  );
  for (const c of cols.slice(1, 4))
    out.push(`<line x1="${c}" y1="${y}" x2="${c}" y2="${y + tableRows * rowH}" stroke="${LINE}" stroke-width="0.8"/>`);
  out.push(`<rect x="${BX}" y="${y}" width="${cols[4] - BX}" height="${rowH}" fill="#e2e8f0" stroke="${LINE}" stroke-width="1.2"/>`);
  cell(cols[0] + 20, y + 16, "STT", "middle", true);
  cell(cols[1] + 8, y + 16, "Tên chi tiết", "start", true);
  cell(cols[2] + 20, y + 16, "SL", "middle", true);
  cell(cols[3] + 8, y + 16, "Dài × Sâu × Cao (mm)", "start", true);
  shown.forEach((r, i) => {
    y += rowH;
    out.push(`<line x1="${BX}" y1="${y}" x2="${cols[4]}" y2="${y}" stroke="${LINE}" stroke-width="0.5"/>`);
    cell(cols[0] + 20, y + 16, String(i + 1), "middle");
    cell(cols[1] + 8, y + 16, trunc(r.name, 32));
    cell(cols[2] + 20, y + 16, String(r.qty), "middle");
    cell(cols[3] + 8, y + 16, r.size);
  });
  if (rows.length > shown.length) {
    y += rowH;
    out.push(`<line x1="${BX}" y1="${y}" x2="${cols[4]}" y2="${y}" stroke="${LINE}" stroke-width="0.5"/>`);
    cell(cols[1] + 8, y + 16, `… và ${rows.length - shown.length} nhóm chi tiết khác (xem file DXF)`);
  }

  // ---------------- Ghi chú ----------------
  const noteLines = [
    ...spec.assumptions.map((a) => `• Giả định: ${a}`),
    ...spec.notes.map((n) => `• ${n}`),
  ].slice(0, 5);
  let ny = Math.max(y + rowH + 28, 830);
  if (noteLines.length && ny < 920) {
    label(BX, ny, "GHI CHÚ KỸ THUẬT");
    for (const line of noteLines) {
      ny += 18;
      if (ny > 925) break;
      out.push(`<text x="${BX}" y="${f(ny)}" font-size="12" fill="#334155">${esc(trunc(line, 82))}</text>`);
    }
  }

  // ---------------- Khung tên ----------------
  const TX = 1040;
  const TY = 935;
  const TW = 520;
  const TH = 155;
  out.push(
    `<rect x="${TX}" y="${TY}" width="${TW}" height="${TH}" fill="#ffffff" stroke="${LINE}" stroke-width="2"/>`,
    `<line x1="${TX}" y1="${TY + 48}" x2="${TX + TW}" y2="${TY + 48}" stroke="${LINE}" stroke-width="1.2"/>`,
    `<line x1="${TX + 320}" y1="${TY + 48}" x2="${TX + 320}" y2="${TY + TH}" stroke="${LINE}" stroke-width="1"/>`,
    `<text x="${TX + 12}" y="${TY + 30}" font-size="20" font-weight="bold" fill="${LINE}">${esc(trunc(spec.title.toUpperCase(), 34))}</text>`,
    `<text x="${TX + TW - 12}" y="${TY + 30}" font-size="12" fill="#475569" text-anchor="end">CNC &amp; AI Workshop</text>`
  );
  const leftRows = [
    `Vật liệu: ${trunc(spec.material, 34)}`,
    `Hoàn thiện: ${trunc(spec.finish, 32)}`,
    `Kích thước tổng: ${mm(W)} × ${mm(D)} × ${mm(H)} mm`,
    `(Dài × Sâu × Cao) · ${spec.parts.length} chi tiết`,
  ];
  const rightRows = [`Mã: ${meta.code}`, `Ngày: ${meta.date}`, "Đơn vị: mm", "Tỷ lệ: NTS"];
  leftRows.forEach((t, i) =>
    out.push(`<text x="${TX + 12}" y="${TY + 72 + i * 24}" font-size="13" fill="${LINE}">${esc(t)}</text>`)
  );
  rightRows.forEach((t, i) =>
    out.push(`<text x="${TX + 332}" y="${TY + 72 + i * 24}" font-size="13" fill="${LINE}">${esc(t)}</text>`)
  );

  out.push(
    `<text x="60" y="1078" font-size="12" fill="#b45309">⚠ Bản phác thảo do AI dựng tự động – kích thước cần kỹ thuật viên xưởng kiểm tra &amp; xác nhận trước khi gia công.</text>`,
    `</svg>`
  );
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// DXF (R12 – tương thích AutoCAD, LibreCAD, SolidWorks...)
// ---------------------------------------------------------------------------

export function renderDxf(spec: CadSpec): string {
  if (isWardrobeSpec(spec)) {
    return renderWardrobeDxf(spec);
  }
  if (isStrutBracketSpec(spec)) {
    return renderStrutBracketDxf(spec);
  }
  const { W, H, D } = bounds(spec);
  const gap = Math.max(W, H, D) * 0.35 + 50;
  const th = Math.max(Math.max(W, H, D) / 60, 5); // chiều cao chữ
  const out: string[] = ["0", "SECTION", "2", "ENTITIES"];
  const n = (v: number) => (Math.round(v * 1000) / 1000).toString();

  const line = (layer: string, x1: number, y1: number, x2: number, y2: number) =>
    out.push("0", "LINE", "8", layer, "10", n(x1), "20", n(y1), "30", "0", "11", n(x2), "21", n(y2), "31", "0");
  const rect = (layer: string, x: number, y: number, w: number, h: number) => {
    line(layer, x, y, x + w, y);
    line(layer, x + w, y, x + w, y + h);
    line(layer, x + w, y + h, x, y + h);
    line(layer, x, y + h, x, y);
  };
  const circle = (x: number, y: number, r: number) =>
    out.push("0", "CIRCLE", "8", "HOLES", "10", n(x), "20", n(y), "30", "0", "40", n(r));
  const text = (layer: string, x: number, y: number, h: number, s: string) =>
    out.push("0", "TEXT", "8", layer, "10", n(x), "20", n(y), "30", "0", "40", n(h), "1", toAscii(s));

  // Hình chiếu đứng tại gốc (x, y)
  for (const p of spec.parts) {
    if (isTriangularPart(p)) {
      line("FRONT", p.x, p.y, p.x, p.y + p.h);
      line("FRONT", p.x, p.y + p.h, p.x + p.w, p.y + p.h);
      line("FRONT", p.x + p.w, p.y + p.h, p.x, p.y);
    } else {
      rect("FRONT", p.x, p.y, p.w, p.h);
    }
  }
  for (const h of spec.holes.filter((h) => h.axis === "z")) circle(h.x, h.y, h.diameter / 2);
  // Hình chiếu bằng phía trên (x, z)
  const ty = H + gap;
  for (const p of spec.parts) rect("TOP", p.x, ty + p.z, p.w, p.d);
  for (const h of spec.holes.filter((h) => h.axis === "y")) circle(h.x, ty + h.z, h.diameter / 2);
  // Hình chiếu cạnh bên phải (z, y)
  const sx = W + gap;
  for (const p of spec.parts) rect("SIDE", sx + p.z, p.y, p.d, p.h);
  for (const h of spec.holes.filter((h) => h.axis === "x")) circle(sx + h.z, h.y, h.diameter / 2);

  // Kích thước tổng (dạng đường + chữ để tương thích mọi phần mềm)
  const off = th * 4;
  line("DIM", 0, -off, W, -off);
  text("DIM", W / 2 - th * 2, -off - th * 1.6, th, mm(W));
  line("DIM", -off, 0, -off, H);
  text("DIM", -off - th * 4, H / 2, th, mm(H));
  line("DIM", sx, -off, sx + D, -off);
  text("DIM", sx + D / 2 - th * 2, -off - th * 1.6, th, mm(D));

  text("LABEL", 0, H + th * 1.5, th, "FRONT VIEW");
  text("LABEL", 0, ty + D + th * 1.5, th, "TOP VIEW");
  text("LABEL", sx, H + th * 1.5, th, "RIGHT SIDE VIEW");
  text("LABEL", 0, -off - th * 6, th * 1.4, `${spec.title} - ${spec.material} - ${spec.finish}`);
  text("LABEL", 0, -off - th * 8.5, th, `Overall ${mm(W)} x ${mm(D)} x ${mm(H)} mm (L x D x H) - AI draft, verify before machining`);

  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 3. RENDER 3D ĐA GÓC NHÌN (3D Multi-angle Studio Views)
// ---------------------------------------------------------------------------

export type CameraAngle = "perspective" | "front" | "top";

export function render3dViewSvg(
  spec: CadSpec,
  angle: CameraAngle = "perspective"
): string {
  const { W, H, D } = bounds(spec);
  const dark = /đen|black|sơn/i.test(`${spec.finish} ${spec.material}`);
  const isWood = /gỗ|wood|mdf/i.test(`${spec.finish} ${spec.material}`);

  // Hệ số chiếu 3D
  type Pt2D = [number, number];
  const project = (x: number, y: number, z: number): Pt2D => {
    if (angle === "front") {
      // Góc nhìn trực diện với độ sâu nhẹ
      return [x - z * 0.2, -y - z * 0.12];
    }
    if (angle === "top") {
      // Góc nhìn từ trên cao xuống 50 độ
      return [x - z * 0.25, z * 0.82 - y * 0.35];
    }
    // "perspective" - Góc nghiêng 3/4 trục đo
    const rad = (30 * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    return [(x - z) * cosA, -y + (x + z) * sinA * 0.7];
  };

  // Tính bounding box 2D sau khi chiếu
  const corners: [number, number, number][] = [
    [0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0],
    [0, 0, D], [W, 0, D], [W, H, D], [0, H, D],
  ];
  const pts = corners.map(([x, y, z]) => project(x, y, z));
  const minU = Math.min(...pts.map((p) => p[0]));
  const maxU = Math.max(...pts.map((p) => p[0]));
  const minV = Math.min(...pts.map((p) => p[1]));
  const maxV = Math.max(...pts.map((p) => p[1]));

  const spanU = Math.max(maxU - minU, 1);
  const spanV = Math.max(maxV - minV, 1);

  // Khổ ảnh 1200 x 800
  const VW = 1200;
  const VH = 800;
  const margin = 140;
  const scale = Math.min((VW - margin * 2) / spanU, (VH - margin * 2) / spanV);

  const cx = (minU + maxU) / 2;
  const cy = (minV + maxV) / 2;
  const toScreen = (x: number, y: number, z: number): [number, number] => {
    const [u, v] = project(x, y, z);
    return [
      Math.round((VW / 2 + (u - cx) * scale) * 10) / 10,
      Math.round((VH / 2 + (v - cy) * scale + 20) * 10) / 10,
    ];
  };

  const angleLabels = {
    perspective: {
      badge: "GÓC NGHIÊNG 3/4",
      sub: "Phối cảnh tổng thể và chiều sâu không gian 3D",
      icon: "📐",
    },
    front: {
      badge: "GÓC CHÍNH DIỆN",
      sub: "Hình chiếu đứng mặt trước và tỉ lệ kích thước",
      icon: "👁️",
    },
    top: {
      badge: "GÓC TRÊN CAO",
      sub: "Mặt đợt, lòng kệ và chi tiết khớp liên kết",
      icon: "🔍",
    },
  }[angle];

  // Sắp xếp các chi tiết theo thứ tự hiển thị từ sau ra trước (Painter's algorithm)
  const sortedParts = [...spec.parts].sort((a, b) => {
    if (angle === "top") {
      return a.y - b.y || a.z - b.z;
    }
    if (angle === "front") {
      return b.z - a.z || a.y - b.y;
    }
    // perspective
    const depthA = a.x - a.z + a.y * 0.5;
    const depthB = b.x - b.z + b.y * 0.5;
    return depthB - depthA;
  });

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" width="${VW}" height="${VH}">`,
    `<defs>`,
    `  <radialGradient id="bgGrad" cx="50%" cy="40%" r="75%">`,
    `    <stop offset="0%" stop-color="#1e293b"/>`,
    `    <stop offset="60%" stop-color="#0f172a"/>`,
    `    <stop offset="100%" stop-color="#020617"/>`,
    `  </radialGradient>`,
    `  <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">`,
    `    <stop offset="0%" stop-color="#000000" stop-opacity="0.6"/>`,
    `    <stop offset="70%" stop-color="#000000" stop-opacity="0.2"/>`,
    `    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>`,
    `  </radialGradient>`,
    `  <linearGradient id="topFaceDark" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `    <stop offset="0%" stop-color="#52525b"/>`,
    `    <stop offset="100%" stop-color="#3f3f46"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="frontFaceDark" x1="0%" y1="0%" x2="0%" y2="100%">`,
    `    <stop offset="0%" stop-color="#27272a"/>`,
    `    <stop offset="100%" stop-color="#18181b"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="sideFaceDark" x1="0%" y1="0%" x2="100%" y2="0%">`,
    `    <stop offset="0%" stop-color="#18181b"/>`,
    `    <stop offset="100%" stop-color="#09090b"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="topFaceLight" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `    <stop offset="0%" stop-color="#f8fafc"/>`,
    `    <stop offset="100%" stop-color="#e2e8f0"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="frontFaceLight" x1="0%" y1="0%" x2="0%" y2="100%">`,
    `    <stop offset="0%" stop-color="#cbd5e1"/>`,
    `    <stop offset="100%" stop-color="#94a3b8"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="sideFaceLight" x1="0%" y1="0%" x2="100%" y2="0%">`,
    `    <stop offset="0%" stop-color="#64748b"/>`,
    `    <stop offset="100%" stop-color="#475569"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="topFaceWood" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `    <stop offset="0%" stop-color="#ecd2a6"/>`,
    `    <stop offset="100%" stop-color="#d6ab72"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="frontFaceWood" x1="0%" y1="0%" x2="0%" y2="100%">`,
    `    <stop offset="0%" stop-color="#b88852"/>`,
    `    <stop offset="100%" stop-color="#8d6233"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="sideFaceWood" x1="0%" y1="0%" x2="100%" y2="0%">`,
    `    <stop offset="0%" stop-color="#5b3a1a"/>`,
    `    <stop offset="100%" stop-color="#3d2611"/>`,
    `  </linearGradient>`,
    `</defs>`,
    `<!-- Background Studio -->`,
    `<rect width="${VW}" height="${VH}" fill="url(#bgGrad)"/>`,
    `<!-- Floor grid lines -->`,
    `<g opacity="0.15" stroke="#94a3b8" stroke-width="1">`
  );

  // Vẽ lưới sàn studio
  for (let gx = -600; gx <= 600; gx += 200) {
    const p1 = toScreen(W / 2 + gx, 0, -200);
    const p2 = toScreen(W / 2 + gx, 0, D + 600);
    out.push(`  <line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}"/>`);
  }
  for (let gz = -200; gz <= D + 600; gz += 200) {
    const p1 = toScreen(W / 2 - 600, 0, gz);
    const p2 = toScreen(W / 2 + 600, 0, gz);
    out.push(`  <line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}"/>`);
  }
  out.push(`</g>`);

  // Bóng đổ dưới chân sản phẩm
  const shadowCenter = toScreen(W / 2, 0, D / 2);
  const shadowRx = Math.max((W * scale) / 1.6, 120);
  const shadowRy = Math.max((D * scale) / 2.8, 45);
  out.push(
    `<ellipse cx="${shadowCenter[0]}" cy="${shadowCenter[1] + 10}" rx="${shadowRx}" ry="${shadowRy}" fill="url(#floorShadow)"/>`
  );

  if (isStrutBracketSpec(spec)) {
    const geom = extractStrutBracketGeometry(spec);
    out.push(
      renderStrutBracket3dElements(
        geom,
        { x: 180, y: 110, w: VW - 360, h: VH - 230 },
        { angle, holeBgColor: "#141f35", idPrefix: `studio-${angle}`, showDimensions: true }
      )
    );
  } else {
    // Vẽ các khối hộp 3D
    for (const p of sortedParts) {
      const x0 = p.x, x1 = p.x + p.w;
      const y0 = p.y, y1 = p.y + p.h;
      const z0 = p.z, z1 = p.z + p.d;

      const p000 = toScreen(x0, y0, z0);
      const p100 = toScreen(x1, y0, z0);
      const p110 = toScreen(x1, y1, z0);
      const p010 = toScreen(x0, y1, z0);

      const p001 = toScreen(x0, y0, z1);
      const p101 = toScreen(x1, y0, z1);
      const p111 = toScreen(x1, y1, z1);
      const p011 = toScreen(x0, y1, z1);

      const partIsWood = isWood || /gỗ|wood|mdf|ván/i.test(p.name);
      const strokeColor = partIsWood ? "#d6ab72" : dark ? "#52525b" : "#cbd5e1";
      const fillTop = partIsWood ? "url(#topFaceWood)" : dark ? "url(#topFaceDark)" : "url(#topFaceLight)";
      const fillFront = partIsWood ? "url(#frontFaceWood)" : dark ? "url(#frontFaceDark)" : "url(#frontFaceLight)";
      const fillSide = partIsWood ? "url(#sideFaceWood)" : dark ? "url(#sideFaceDark)" : "url(#sideFaceLight)";

      if (isTriangularPart(p)) {
        // Mặt tam giác trước và mặt vát chéo chịu lực
        out.push(
          `<polygon points="${p010[0]},${p010[1]} ${p110[0]},${p110[1]} ${p000[0]},${p000[1]}" fill="${fillFront}" stroke="${strokeColor}" stroke-width="1" stroke-linejoin="round"/>`,
          `<polygon points="${p000[0]},${p000[1]} ${p110[0]},${p110[1]} ${p111[0]},${p111[1]} ${p001[0]},${p001[1]}" fill="${fillSide}" stroke="${strokeColor}" stroke-width="1" stroke-linejoin="round"/>`,
          `<polygon points="${p010[0]},${p010[1]} ${p110[0]},${p110[1]} ${p111[0]},${p111[1]} ${p011[0]},${p011[1]}" fill="${fillTop}" stroke="${strokeColor}" stroke-width="1" stroke-linejoin="round"/>`
        );
      } else {
        // Mặt trên (y = y1)
        out.push(
          `<polygon points="${p010[0]},${p010[1]} ${p110[0]},${p110[1]} ${p111[0]},${p111[1]} ${p011[0]},${p011[1]}" fill="${fillTop}" stroke="${strokeColor}" stroke-width="1" stroke-linejoin="round"/>`
        );

        // Mặt trước & mặt cạnh
        if (angle === "front" || angle === "perspective") {
          out.push(
            `<polygon points="${p000[0]},${p000[1]} ${p100[0]},${p100[1]} ${p110[0]},${p110[1]} ${p010[0]},${p010[1]}" fill="${fillFront}" stroke="${strokeColor}" stroke-width="1" stroke-linejoin="round"/>`,
            `<polygon points="${p100[0]},${p100[1]} ${p101[0]},${p101[1]} ${p111[0]},${p111[1]} ${p110[0]},${p110[1]}" fill="${fillSide}" stroke="${strokeColor}" stroke-width="1" stroke-linejoin="round"/>`
          );
        } else {
          out.push(
            `<polygon points="${p001[0]},${p001[1]} ${p101[0]},${p101[1]} ${p111[0]},${p111[1]} ${p011[0]},${p011[1]}" fill="${fillFront}" stroke="${strokeColor}" stroke-width="1" stroke-linejoin="round"/>`
          );
        }
      }
    }

    // Vẽ các lỗ khoét
    for (const h of spec.holes) {
      const hp = toScreen(h.x, h.y, h.z);
      const hr = Math.max((h.diameter * scale) / 2, 2.5);
      out.push(
        `<circle cx="${hp[0]}" cy="${hp[1]}" r="${hr}" fill="#090d16" stroke="#94a3b8" stroke-width="1.2"/>`
      );
    }
  }

  // Header Badge (Góc nhìn)
  out.push(
    `<!-- Header Badge -->`,
    `<g transform="translate(40, 40)">`,
    `  <rect width="360" height="60" rx="14" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-width="1"/>`,
    `  <text x="20" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#38bdf8">${angleLabels.icon} ${esc(angleLabels.badge)}</text>`,
    `  <text x="20" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">${esc(angleLabels.sub)}</text>`,
    `</g>`
  );

  // Watermark Brand Badge (Top-right)
  out.push(
    `<!-- Studio Logo -->`,
    `<g transform="translate(${VW - 260}, 40)">`,
    `  <rect width="220" height="42" rx="10" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-width="1"/>`,
    `  <text x="110" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="#f8fafc" text-anchor="middle">CNC &amp; AI WORKSHOP · 3D</text>`,
    `</g>`
  );

  // Bottom Info Card (Thông tin sản phẩm)
  out.push(
    `<!-- Bottom Info Card -->`,
    `<g transform="translate(40, ${VH - 110})">`,
    `  <rect width="520" height="70" rx="12" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-width="1"/>`,
    `  <text x="20" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" fill="#f8fafc">${esc(trunc(spec.title, 40))}</text>`,
    `  <text x="20" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#94a3b8">Kích thước: <tspan fill="#38bdf8" font-weight="bold">${Math.round(W)} × ${Math.round(D)} × ${Math.round(H)} mm</tspan> · ${esc(trunc(spec.material, 35))}</text>`,
    `</g>`,
    `</svg>`
  );

  return out.join("\n");
}
