"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { authenticate, createSession, destroySession, requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FILE_NAME_PATTERN, UPLOAD_DIR } from "@/lib/uploads";
import { OrderStatus, AccessRequestType } from "@/app/generated/prisma/enums";
import { generatePassword, hashPassword } from "@/lib/password";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const session = await authenticate(username, password);
  if (!session) {
    // Làm chậm để hạn chế brute-force dò mật khẩu
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  }

  await createSession(session);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(Object.values(OrderStatus) as string[]).includes(status)) return;

  await prisma.customOrder.update({ where: { id }, data: { status: status as OrderStatus } });
  revalidatePath("/admin");
}

async function removeUpload(url: string | null) {
  if (!url) return;
  const name = url.split("/").pop();
  if (!name) return;
  if (url.startsWith("/ai-previews/")) {
    await unlink(path.join(process.cwd(), "public", "ai-previews", name)).catch(() => {});
    return;
  }
  if (!FILE_NAME_PATTERN.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}

export async function deleteOrder(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const order = await prisma.customOrder.findUnique({ where: { id } });
  if (!order) return;

  await prisma.customOrder.delete({ where: { id } });
  await Promise.all([
    removeUpload(order.cadFileUrl),
    removeUpload(order.referenceImageUrl),
    removeUpload(order.aiSketchUrl),
  ]);
  revalidatePath("/admin");
  redirect("/admin");
}

export type ApprovalResult = {
  success: boolean;
  message: string;
  generatedPassword?: string;
  phone?: string;
  username?: string;
};

/** Admin chính duyệt yêu cầu đăng ký hoặc cấp lại mật khẩu cho nhân viên */
export async function approveAccessRequest(requestId: string): Promise<ApprovalResult> {
  await requireSuperAdmin();

  const req = await prisma.accessRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "PENDING") {
    return { success: false, message: "Yêu cầu không hợp lệ hoặc đã được xử lý." };
  }

  const rawPassword = generatePassword(10);
  const passwordHash = await hashPassword(rawPassword);

  if (req.type === AccessRequestType.REGISTER) {
    // Kiểm tra username trùng
    const existing = await prisma.adminAccount.findUnique({ where: { username: req.username.toLowerCase() } });
    if (existing) {
      await prisma.adminAccount.update({
        where: { id: existing.id },
        data: {
          fullName: req.fullName || existing.fullName,
          phone: req.phone,
          passwordHash,
          active: true,
        },
      });
    } else {
      await prisma.adminAccount.create({
        data: {
          username: req.username.toLowerCase(),
          fullName: req.fullName || "Nhân viên xưởng",
          phone: req.phone,
          passwordHash,
          active: true,
        },
      });
    }
  } else {
    // RESET password
    const existing = await prisma.adminAccount.findFirst({
      where: {
        OR: [{ username: req.username.toLowerCase() }, { phone: req.phone }],
      },
    });

    if (!existing) {
      return { success: false, message: "Không tìm thấy tài khoản nhân viên tương ứng." };
    }

    await prisma.adminAccount.update({
      where: { id: existing.id },
      data: { passwordHash, active: true },
    });
  }

  await prisma.accessRequest.update({
    where: { id: req.id },
    data: { status: "APPROVED" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/access-requests");

  return {
    success: true,
    message: "Đã duyệt và tạo mật khẩu thành công.",
    generatedPassword: rawPassword,
    phone: req.phone,
    username: req.username,
  };
}

export async function rejectAccessRequest(requestId: string) {
  await requireSuperAdmin();

  await prisma.accessRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/access-requests");
}
