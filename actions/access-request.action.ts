"use server";

import { prisma } from "@/lib/prisma";
import { AccessRequestType } from "@/app/generated/prisma/enums";
import { normalizePhone, ADMIN_EMAIL } from "@/lib/site";
import { sendAccessRequestEmail } from "@/lib/email";

export type AccessRequestFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitRegisterRequest(
  _prev: AccessRequestFormState,
  formData: FormData,
): Promise<AccessRequestFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const phone = normalizePhone(rawPhone);
  const username = String(formData.get("username") ?? "").trim().toLowerCase();

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.fullName = "Vui lòng nhập họ và tên.";
  if (!phone) fieldErrors.phone = "Vui lòng nhập số điện thoại.";
  if (!username) fieldErrors.username = "Vui lòng nhập tên đăng nhập mong muốn.";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Vui lòng điền đầy đủ thông tin.", fieldErrors };
  }

  try {
    await prisma.accessRequest.create({
      data: {
        type: AccessRequestType.REGISTER,
        fullName,
        phone: rawPhone,
        username,
      },
    });

    // Gửi email thông báo cho Admin (huy01082004@gmail.com)
    sendAccessRequestEmail({
      type: "REGISTER",
      fullName,
      phone: rawPhone,
      username,
    }).catch((e) => console.error("Send email error:", e));

    return {
      status: "success",
      message: `Yêu cầu đăng ký đã được gửi đến Admin qua Email (${ADMIN_EMAIL}). Bạn không thể tự ý đăng nhập cho đến khi Admin duyệt và cấp mật khẩu.`,
    };
  } catch (error) {
    console.error("Register request error:", error);
    return { status: "error", message: "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau." };
  }
}

export async function submitForgotPasswordRequest(
  _prev: AccessRequestFormState,
  formData: FormData,
): Promise<AccessRequestFormState> {
  const usernameOrPhone = String(formData.get("usernameOrPhone") ?? "").trim();

  if (!usernameOrPhone) {
    return {
      status: "error",
      message: "Vui lòng nhập tên đăng nhập hoặc số điện thoại.",
    };
  }

  const phone = normalizePhone(usernameOrPhone);

  try {
    await prisma.accessRequest.create({
      data: {
        type: AccessRequestType.RESET,
        fullName: "",
        phone: phone || usernameOrPhone,
        username: usernameOrPhone.toLowerCase(),
      },
    });

    // Gửi email thông báo cho Admin (huy01082004@gmail.com)
    sendAccessRequestEmail({
      type: "RESET",
      phone: phone || usernameOrPhone,
      username: usernameOrPhone.toLowerCase(),
    }).catch((e) => console.error("Send email error:", e));

    return {
      status: "success",
      message: `Yêu cầu cấp lại mật khẩu đã được gửi đến Admin qua Email (${ADMIN_EMAIL}). Mật khẩu mới sẽ được cung cấp sau khi Admin phê duyệt.`,
    };
  } catch (error) {
    console.error("Forgot password request error:", error);
    return { status: "error", message: "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau." };
  }
}
