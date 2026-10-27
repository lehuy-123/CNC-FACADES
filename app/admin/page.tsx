import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/app/generated/prisma/enums";
import { STATUS_LABELS, STATUS_ORDER, formatDateTime } from "@/lib/orders";
import AdminShell from "./_components/AdminShell";
import StatusBadge from "./_components/StatusBadge";

export default function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  return (
    <AdminShell>
      <Suspense fallback={<p className="py-20 text-center text-slate-500">Đang tải...</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();

  const { status: statusParam } = await searchParams;
  const raw = Array.isArray(statusParam) ? statusParam[0] : statusParam;
  const filter = (Object.values(OrderStatus) as string[]).includes(raw ?? "") ? (raw as OrderStatus) : undefined;

  const orders = await prisma.customOrder.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { createdAt: "desc" },
  });
  const grouped = await prisma.customOrder.groupBy({ by: ["status"], _count: { _all: true } });

  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<
    Record<OrderStatus, number>
  >;
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

  return (
    <>
      <h1 className="text-2xl font-extrabold text-[#0f2a5c]">Quản lý yêu cầu gia công</h1>
      <p className="mt-1 text-sm text-slate-600">Các yêu cầu khách hàng gửi từ website.</p>

      {/* Thống kê */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-500">Tổng số</p>
          <p className="mt-1 text-3xl font-extrabold text-[#0f2a5c]">{total}</p>
        </div>
        {STATUS_ORDER.map((s) => (
          <div key={s} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">{STATUS_LABELS[s]}</p>
            <p className="mt-1 text-3xl font-extrabold text-blue-700">{counts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Bộ lọc */}
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Lọc theo trạng thái">
        {[{ key: undefined, label: "Tất cả" }, ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABELS[s] }))].map(
          (tab) => {
            const active = tab.key === filter;
            return (
              <Link
                key={tab.label}
                href={tab.key ? `/admin?status=${tab.key}` : "/admin"}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {tab.label}
              </Link>
            );
          },
        )}
      </nav>

      {/* Danh sách */}
      <div className="mt-4 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
        {orders.length === 0 ? (
          <p className="px-6 py-16 text-center text-slate-500">Chưa có yêu cầu nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Yêu cầu</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-blue-50/40">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      <span className="font-mono text-xs font-bold text-blue-700">{o.code || "—"}</span>
                      <p className="text-[11px] text-slate-400">{formatDateTime(o.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{o.customerName}</p>
                      <a href={`tel:${o.phone}`} className="text-blue-600 hover:underline">
                        {o.phone}
                      </a>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">
                      <p className="line-clamp-2">{o.requirements}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {o.cadFileUrl && <span className="mr-1 rounded bg-slate-100 px-2 py-0.5 font-medium">CAD</span>}
                      {o.referenceImageUrl && <span className="mr-1 rounded bg-slate-100 px-2 py-0.5 font-medium">Ảnh</span>}
                      {o.aiSketchUrl && <span className="rounded bg-purple-100 px-2 py-0.5 font-semibold text-purple-700">AI Demo</span>}
                      {!o.cadFileUrl && !o.referenceImageUrl && !o.aiSketchUrl && "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Chi tiết
                      </Link>
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
