"use server";

import { revalidatePath } from "next/cache";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveProductImage, PRODUCT_UPLOAD_DIR } from "@/lib/product-upload";

export type ProductFormState = {
  success?: boolean;
  message?: string;
  error?: string;
};

/**
 * Tạo mới hoặc cập nhật sản phẩm mẫu
 */
export async function saveProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireAdmin();

  try {
    const id = String(formData.get("id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim() || "Khác";
    const dimensions = String(formData.get("dimensions") ?? "").trim() || null;
    const material = String(formData.get("material") ?? "").trim() || null;
    const rawPrice = String(formData.get("price") ?? "").replace(/[^\d]/g, "");
    const price = rawPrice ? parseFloat(rawPrice) : null;
    const description = String(formData.get("description") ?? "").trim() || null;
    const existingImageUrl = String(formData.get("existingImageUrl") ?? "").trim();
    const inputImageUrl = String(formData.get("imageUrl") ?? "").trim();
    const imageFile = formData.get("imageFile") as File | null;

    if (!name) {
      return { error: "Vui lòng nhập tên sản phẩm mẫu." };
    }

    // Xử lý upload ảnh mới nếu có
    let finalImageUrl = existingImageUrl;
    if (imageFile && imageFile.size > 0) {
      finalImageUrl = await saveProductImage(imageFile);
    } else if (inputImageUrl && inputImageUrl !== existingImageUrl) {
      finalImageUrl = inputImageUrl;
    }

    if (!finalImageUrl) {
      finalImageUrl = "https://placehold.co/800x600/0f2a5c/ffffff?text=CNC+Product";
    }

    const rawAiContext = String(formData.get("baseAiContext") ?? "").trim();
    const rawCadTemplate = String(formData.get("cadTemplate") ?? "").trim();

    let parsedCadTemplate: any = null;
    if (rawCadTemplate) {
      try {
        parsedCadTemplate = JSON.parse(rawCadTemplate);
      } catch {
        return { error: "Cấu trúc JSON của CAD Template không hợp lệ. Vui lòng kiểm tra lại cú pháp." };
      }
    }

    if (!parsedCadTemplate) {
      let l = 300, w = 150, h = 100, t = 2;
      if (dimensions) {
        const match = dimensions.match(/(\d+)\s*[×x*]\s*(\d+)(?:\s*[×x*]\s*(\d+))?/i);
        if (match) {
          l = parseInt(match[1], 10);
          w = parseInt(match[2], 10);
          h = match[3] ? parseInt(match[3], 10) : 100;
        }
      }
      if (material) {
        const matThickMatch = material.match(/(\d+(?:\.\d+)?)\s*mm/i);
        if (matThickMatch) t = parseFloat(matThickMatch[1]);
      }
      parsedCadTemplate = {
        title: name,
        baseDimensions: { length: l, width: w, height: h, thickness: t },
        material: material || "Thép tấm SS400",
        finish: "Sơn tĩnh điện chống rỉ sét",
        parts: [
          { name: "Mặt phẳng chính", x: 0, y: 0, z: 0, w: l, h: t, d: w },
          { name: "Cạnh bẻ chấn tăng cứng", x: 0, y: t, z: 0, w: l, h: Math.max(10, h - t), d: t }
        ],
        holes: [
          { x: Math.round(l * 0.2), y: Math.round(t / 2), z: Math.round(w / 2), diameter: 8, axis: "y" },
          { x: Math.round(l * 0.8), y: Math.round(t / 2), z: Math.round(w / 2), diameter: 8, axis: "y" }
        ],
        notes: ["Gia công cắt laser fiber và chấn CNC", "Dung sai ±0.03mm"]
      };
    }

    const finalAiContext = rawAiContext || `Mô hình sản phẩm ${name}. Nguyên lý kết cấu: Khi người dùng thay đổi kích thước Dài L, Rộng W, Cao H, Dày T: Tự động tỷ lệ hóa hình học các chi tiết kim loại và vị trí các lỗ kỹ thuật theo kích cỡ chuẩn, duy trì kết cấu cơ khí chính xác.`;

    if (id) {
      // Cập nhật sản phẩm
      await prisma.product.update({
        where: { id },
        data: {
          name,
          category,
          dimensions,
          material,
          price,
          description,
          imageUrl: finalImageUrl,
          baseAiContext: finalAiContext,
          cadTemplate: parsedCadTemplate,
        },
      });

      revalidatePath("/");
      revalidatePath("/admin/products");
      return { success: true, message: "Đã cập nhật sản phẩm mẫu thành công!" };
    } else {
      // Tạo mới sản phẩm
      await prisma.product.create({
        data: {
          name,
          category,
          dimensions,
          material,
          price,
          description,
          imageUrl: finalImageUrl,
          baseAiContext: finalAiContext,
          cadTemplate: parsedCadTemplate,
        },
      });

      revalidatePath("/");
      revalidatePath("/admin/products");
      return { success: true, message: "Đã thêm sản phẩm mẫu mới thành công!" };
    }
  } catch (err: unknown) {
    console.error("[Admin Save Product Error]:", err);
    return {
      error: err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu sản phẩm.",
    };
  }
}

/**
 * Xóa sản phẩm mẫu
 */
export async function deleteProduct(formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { error: "Không tìm thấy mã sản phẩm." };

    const prod = await prisma.product.findUnique({ where: { id } });
    if (!prod) return { error: "Sản phẩm không tồn tại hoặc đã bị xóa." };

    // Nếu ảnh lưu cục bộ trong public/products, dọn dẹp file
    if (prod.imageUrl && prod.imageUrl.startsWith("/products/prod-")) {
      const fileName = path.basename(prod.imageUrl);
      await unlink(path.join(PRODUCT_UPLOAD_DIR, fileName)).catch(() => {});
    }

    await prisma.product.delete({ where: { id } });

    revalidatePath("/");
    revalidatePath("/admin/products");
    return { success: true, message: "Đã xóa sản phẩm mẫu thành công!" };
  } catch (err: unknown) {
    console.error("[Admin Delete Product Error]:", err);
    return {
      error: err instanceof Error ? err.message : "Đã xảy ra lỗi khi xóa sản phẩm.",
    };
  }
}
