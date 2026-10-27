import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS, STATUS_ORDER, formatDateTime } from "@/lib/orders";
import { deleteOrder, updateOrderStatus } from "@/app/admin/actions";
import AdminShell from "../../_components/AdminShell";
import StatusBadge from "../../_components/StatusBadge";

export default function OrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <AdminShell>
      <Suspense fallback={<p className="py-20 text-center text-slate-500">Đang tải...</p>}>
        <OrderDetail params={params} />
      </Suspense>
    </AdminShell>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function OrderDetail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const order = await prisma.customOrder.findUnique({ where: { id } });
  if (!order) notFound();

  return (
    <>
      <Link href="/admin" className="text-sm font-medium text-blue-600 hover:underline">
        ← Danh sách yêu cầu
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-[#0f2a5c]">{order.customerName}</h1>
                {order.code && (
                  <span className="font-mono rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                    {order.code}
                  </span>
                )}
              </div>
              <a href={`tel:${order.phone}`} className="text-blue-600 hover:underline">
                {order.phone}
              </a>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <h2 className="mt-6 text-sm font-semibold uppercase text-slate-500">Yêu cầu gia công</h2>
          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-slate-800">{order.requirements}</p>

          <h2 className="mt-6 text-sm font-semibold uppercase text-slate-500">File đính kèm</h2>
          <div className="mt-2 space-y-4">
            {order.cadFileUrl && (
              <a
                href={order.cadFileUrl}
                download
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                ⬇ Tải file AutoCAD
              </a>
            )}
            {order.referenceImageUrl && (
              <a href={order.referenceImageUrl} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.referenceImageUrl}
                  alt="Hình ảnh mẫu khách tải lên"
                  className="max-h-96 rounded-lg border border-slate-200 object-contain"
                />
              </a>
            )}
            {order.aiSketchUrl && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
                <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase text-purple-700">
                  ✨ Bản phác thảo AI (Khách đã xem &amp; duyệt demo)
                </span>
                <a href={order.aiSketchUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.aiSketchUrl}
                    alt="Bản vẽ phác thảo AI do khách chọn"
                    className="max-h-96 w-full rounded-lg border border-purple-200 bg-white object-contain shadow-sm"
                  />
                </a>
                <p className="mt-2 text-xs text-purple-700">
                  * Nhấp vào ảnh để mở xem toàn màn hình độ phân giải cao.
                </p>
              </div>
            )}
            {!order.cadFileUrl && !order.referenceImageUrl && !order.aiSketchUrl && (
              <p className="text-sm text-slate-500">Khách không đính kèm file hay bản vẽ.</p>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase text-slate-500">Cập nhật trạng thái</h2>
            <form action={updateOrderStatus} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/25"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Lưu trạng thái
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-blue-100 bg-white p-6 text-sm text-slate-600 shadow-sm">
            <p>
              <span className="font-semibold text-slate-800">Gửi lúc:</span> {formatDateTime(order.createdAt)}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-slate-800">Cập nhật:</span> {formatDateTime(order.updatedAt)}
            </p>
            <p className="mt-1 break-all text-xs text-slate-400">Mã: {order.id}</p>
          </section>

          <section className="rounded-xl border border-red-200 bg-red-50/50 p-6">
            <h2 className="text-sm font-semibold uppercase text-red-700">Vùng nguy hiểm</h2>
            <form action={deleteOrder} className="mt-3">
              <input type="hidden" name="id" value={order.id} />
              <button
                type="submit"
                className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-600 hover:bg-red-600 hover:text-white"
              >
                Xóa yêu cầu này
              </button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
