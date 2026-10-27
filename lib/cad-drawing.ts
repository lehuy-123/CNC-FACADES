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

export function renderSvg(spec: CadSpec, meta: { date: string; code: string }): string {
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
