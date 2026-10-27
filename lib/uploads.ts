import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Lưu ngoài thư mục public để chỉ admin đã đăng nhập mới tải được (qua /admin/files/...)
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const CAD_EXTENSIONS = [".dwg", ".dxf"];
export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

export const MIME_BY_EXT: Record<string, string> = {
  ".dwg": "application/acad",
  ".dxf": "application/dxf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const FILE_NAME_PATTERN = /^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

export function fileUrl(storedName: string) {
  return `/admin/files/${storedName}`;
}

/** Kiểm tra và lưu file. Trả về URL, null nếu không có file, hoặc ném Error nếu không hợp lệ. */
export async function saveUpload(file: File | null, allowed: string[], label: string) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_FILE_SIZE) throw new Error(`${label} vượt quá 10MB.`);
  const ext = path.extname(file.name).toLowerCase();
  if (!allowed.includes(ext)) {
    throw new Error(`${label} chỉ chấp nhận định dạng: ${allowed.join(", ")}.`);
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const stored = `${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, stored), Buffer.from(await file.arrayBuffer()));
  return fileUrl(stored);
}
