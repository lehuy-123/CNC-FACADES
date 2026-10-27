"use client";

import { useState, useTransition } from "react";
import { approveAccessRequest, rejectAccessRequest, type ApprovalResult } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/orders";

type RequestItem = {
  id: string;
  type: "REGISTER" | "RESET";
  fullName: string;
  phone: string;
  username: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
};

export default function RequestList({ requests }: { requests: RequestItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [approvalModal, setApprovalModal] = useState<ApprovalResult | null>(null);

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const res = await approveAccessRequest(id);
      if (res.success) {
        setApprovalModal(res);
      } else {
        alert(res.message);
      }
    });
  };

  const handleReject = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) return;
    startTransition(async () => {
      await rejectAccessRequest(id);
    });
  };

  return (
    <>
      {/* Modal hiển thị mật khẩu vừa sinh cho Admin */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              ✓
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">Đã duyệt &amp; sinh mật khẩu thành công</h3>
            <p className="mt-1 text-xs text-slate-500">
              Mật khẩu mới đã được kích hoạt trong hệ thống. Vui lòng cung cấp mật khẩu này cho nhân sự để đăng nhập.
            </p>

            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Tài khoản:</span>
                <span className="font-semibold text-slate-800">{approvalModal.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SĐT nhân viên:</span>
                <a href={`tel:${approvalModal.phone}`} className="font-semibold text-blue-600 hover:underline">
                  {approvalModal.phone}
                </a>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <span className="text-xs uppercase text-slate-400">Mật khẩu cấp phát:</span>
                <div className="mt-1 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <span className="font-mono text-lg font-bold text-blue-700">{approvalModal.generatedPassword}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (approvalModal.generatedPassword) {
                        navigator.clipboard.writeText(approvalModal.generatedPassword);
                        alert("Đã chép mật khẩu!");
                      }
                    }}
                    className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                  >
                    Sao chép
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setApprovalModal(null)}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700"
            >
              Đã ghi nhận / Đóng
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
        {requests.length === 0 ? (
          <p className="px-6 py-16 text-center text-slate-500">
            Hiện không có yêu cầu đăng ký hoặc quên mật khẩu nào.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Loại yêu cầu</th>
                  <th className="px-4 py-3">Người yêu cầu</th>
                  <th className="px-4 py-3">Tài khoản mong muốn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/30">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(new Date(r.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      {r.type === "REGISTER" ? (
                        <span className="rounded bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                          ĐĂNG KÝ MỚI
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                          QUÊN MẬT KHẨU
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{r.fullName || "—"}</p>
                      <a href={`tel:${r.phone}`} className="text-xs text-blue-600 hover:underline">
                        SĐT: {r.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-700">
                      {r.username}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "PENDING" && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600 ring-1 ring-amber-200">
                          Chờ duyệt
                        </span>
                      )}
                      {r.status === "APPROVED" && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">
                          Đã cấp mật khẩu
                        </span>
                      )}
                      {r.status === "REJECTED" && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
                          Đã từ chối
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleApprove(r.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Duyệt &amp; Cấp mật khẩu
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleReject(r.id)}
                            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Đã xong</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
