import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), "public", "products");
export const MAX_PRODUCT_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
export const ALLOWED_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

/**
 * Lưu ảnh sản phẩm mẫu vào thư mục public/products để phục vụ hiển thị trực tiếp.
 * Trả về URL đường dẫn tương đối (vd: /products/abc-123.jpg)
 */
export async function saveProductImage(file: File | null, fallbackUrl?: string): Promise<string> {
  if (file && file.size > 0) {
    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      throw new Error("File ảnh sản phẩm không được vượt quá 8MB.");
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
      throw new Error(`Định dạng ảnh không hợp lệ. Chỉ chấp nhận: ${ALLOWED_IMAGE_EXTS.join(", ")}`);
    }

    await mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
    const fileName = `prod-${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(PRODUCT_UPLOAD_DIR, fileName), buffer);
    return `/products/${fileName}`;
  }

  if (fallbackUrl && fallbackUrl.trim()) {
    return fallbackUrl.trim();
  }

  return "https://placehold.co/800x600/0f2a5c/ffffff?text=CNC+Product";
}
