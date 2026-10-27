export const ADMIN_EMAIL = "huy01082004@gmail.com";

/** Bỏ khoảng trắng, dấu chấm, gạch ngang để so sánh và lưu trữ số điện thoại chuẩn. */
export function normalizePhone(phone: string) {
  return phone.replace(/[\s.\-()]/g, "");
}
