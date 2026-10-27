import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminShell from "../_components/AdminShell";
import RequestList from "./RequestList";
import { ADMIN_EMAIL } from "@/lib/site";

export default function AccessRequestsPage() {
  return (
    <AdminShell>
      <Suspense fallback={<p className="py-20 text-center text-slate-500">Đang tải yêu cầu...</p>}>
        <AccessRequestsContent />
      </Suspense>
    </AdminShell>
  );
}

async function AccessRequestsContent() {
  await requireAdmin();

  const requests = await prisma.accessRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2a5c]">
            Yêu cầu cấp quyền &amp; Quên mật khẩu
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Tất cả yêu cầu đăng ký truy cập Dashboard hoặc xin cấp lại mật khẩu từ nhân sự.
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
          Email nhận thông báo: <span className="font-bold">{ADMIN_EMAIL}</span>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Đang chờ xử lý: <span className="font-bold text-lg text-amber-700">{pendingCount}</span>
        </div>
      </div>

      <div className="mt-6">
        <RequestList
          requests={requests.map((r) => ({
            id: r.id,
            type: r.type,
            fullName: r.fullName,
            phone: r.phone,
            username: r.username,
            status: r.status,
            createdAt: r.createdAt,
          }))}
        />
      </div>
    </>
  );
}
