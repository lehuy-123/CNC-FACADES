"use server";

import { prisma } from "@/lib/prisma";
import { CAD_EXTENSIONS, IMAGE_EXTENSIONS, saveUpload } from "@/lib/uploads";
import { generateOrderCode } from "@/lib/password";
import { normalizePhone } from "@/lib/site";
import { OrderStatus } from "@/app/generated/prisma/enums";
import { sendNewOrderEmail } from "@/lib/email";

export type OrderFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  orderCode?: string;
  fieldErrors?: Partial<Record<"customerName" | "phone" | "requirements", string>>;
  values?: { customerName: string; phone: string; requirements: string };
};

export async function submitOrder(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const phone = normalizePhone(rawPhone);
  const requirements = String(formData.get("requirements") ?? "").trim();
  const values = { customerName, phone: rawPhone, requirements };

  // Honeypot chống bot
  if (String(formData.get("website") ?? "") !== "") {
    return { status: "success", message: "Đã gửi yêu cầu." };
  }

  const fieldErrors: NonNullable<OrderFormState["fieldErrors"]> = {};
  if (customerName.length < 2 || customerName.length > 100) {
    fieldErrors.customerName = "Vui lòng nhập họ và tên (2-100 ký tự).";
  }
  if (!/^\+?[0-9]{8,15}$/.test(phone)) {
    fieldErrors.phone = "Số điện thoại không hợp lệ.";
  }
  if (requirements.length < 10 || requirements.length > 5000) {
    fieldErrors.requirements = "Vui lòng mô tả yêu cầu (10-5000 ký tự).";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Vui lòng kiểm tra lại thông tin.", fieldErrors, values };
  }

  try {
    const cadFile = formData.get("cadFile");
    const imageFile = formData.get("imageFile");
    const uploadedCadUrl = await saveUpload(cadFile instanceof File ? cadFile : null, CAD_EXTENSIONS, "File AutoCAD");
    const referenceImageUrl = await saveUpload(
      imageFile instanceof File ? imageFile : null,
      IMAGE_EXTENSIONS,
      "Hình ảnh mẫu",
    );

    const rawAiSketch = String(formData.get("aiSketchUrl") ?? "").trim();
    const aiSketchUrl = rawAiSketch.startsWith("/ai-previews/") ? rawAiSketch : null;

    const rawAiDxf = String(formData.get("aiDxfUrl") ?? "").trim();
    const aiDxfUrl = rawAiDxf.startsWith("/ai-previews/") ? rawAiDxf : null;

    // Nếu khách không tự tải file CAD nhưng đã duyệt phác thảo CAD từ AI thì lấy file DXF của AI
    const cadFileUrl = uploadedCadUrl || aiDxfUrl;

    // Sinh mã đơn hàng duy nhất
    let code = generateOrderCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.customOrder.findFirst({ where: { code } });
      if (!exists) break;
      code = generateOrderCode();
    }

    const rawModifiedParams = String(formData.get("modifiedParams") ?? "").trim();
    let modifiedParams: any = undefined;
    if (rawModifiedParams) {
      try {
        modifiedParams = JSON.parse(rawModifiedParams);
      } catch {}
    }

    await prisma.customOrder.create({
      data: {
        code,
        customerName,
        phone,
        requirements,
        cadFileUrl,
        referenceImageUrl,
        aiSketchUrl,
        modifiedParams,
      },
    });

    // Gửi email thông báo cho Admin (huy01082004@gmail.com)
    sendNewOrderEmail({
      code,
      customerName,
      phone,
      requirements,
      hasCad: Boolean(cadFileUrl),
      hasImage: Boolean(referenceImageUrl),
      hasAiSketch: Boolean(aiSketchUrl),
      aiSketchUrl: aiSketchUrl ?? undefined,
    }).catch((e) => console.error("Send new order email error:", e));

    return {
      status: "success",
      orderCode: code,
      message: "Đã gửi yêu cầu thành công! Xưởng sẽ liên hệ báo giá cho bạn sớm nhất.",
    };
  } catch (err) {
    const message =
      err instanceof Error && /File AutoCAD|Hình ảnh mẫu/.test(err.message)
        ? err.message
        : "Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.";
    if (!(err instanceof Error && /File AutoCAD|Hình ảnh mẫu/.test(err.message))) console.error(err);
    return { status: "error", message, values };
  }
}

export type OrderLookupItem = {
  id: string;
  code: string | null;
  customerName: string;
  phone: string;
  requirements: string;
  status: OrderStatus;
  createdAt: Date;
  hasCadFile: boolean;
  hasImageFile: boolean;
  hasAiSketch: boolean;
  aiSketchUrl?: string | null;
};

/** Tra cứu đơn hàng theo Số điện thoại hoặc Mã đơn hàng mà KHÔNG CẦN đăng nhập */
export async function lookupOrders(query: string): Promise<{ success: boolean; data?: OrderLookupItem[]; message?: string }> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 3) {
    return { success: false, message: "Vui lòng nhập tối thiểu 3 ký tự (Số điện thoại hoặc Mã đơn)." };
  }

  const phoneQuery = normalizePhone(trimmed);

  try {
    const orders = await prisma.customOrder.findMany({
      where: {
        OR: [
          { phone: phoneQuery },
          { code: { equals: trimmed.toUpperCase() } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      success: true,
      data: orders.map((o) => ({
        id: o.id,
        code: o.code,
        customerName: o.customerName,
        phone: o.phone,
        requirements: o.requirements,
        status: o.status,
        createdAt: o.createdAt,
        hasCadFile: Boolean(o.cadFileUrl),
        hasImageFile: Boolean(o.referenceImageUrl),
        hasAiSketch: Boolean(o.aiSketchUrl),
        aiSketchUrl: o.aiSketchUrl,
      })),
    };
  } catch (error) {
    console.error("Lookup orders error:", error);
    return { success: false, message: "Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau." };
  }
}
