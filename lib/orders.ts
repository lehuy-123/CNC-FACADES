import type { OrderStatus } from "@/app/generated/prisma/enums";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ xử lý",
  QUOTED: "Đã báo giá",
  PROCESSING: "Đang gia công",
  COMPLETED: "Hoàn thành",
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 ring-amber-200",
  QUOTED: "bg-sky-100 text-sky-800 ring-sky-200",
  PROCESSING: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

export const STATUS_ORDER: OrderStatus[] = ["PENDING", "QUOTED", "PROCESSING", "COMPLETED"];

export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}
