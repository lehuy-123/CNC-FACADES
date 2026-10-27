import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { ADMIN_EMAIL } from "@/lib/site";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-extrabold tracking-tight text-[#0f2a5c]">
              CNC <span className="text-blue-600">&amp;</span> AI Workshop
              <span className="ml-2 rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold uppercase text-white">
                Admin
              </span>
            </Link>

            <nav className="hidden items-center gap-2 sm:flex">
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600"
              >
                Đơn gia công
              </Link>
              <Link
                href="/admin/products"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600"
              >
                Sản phẩm mẫu
              </Link>
              <Link
                href="/admin/access-requests"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600"
              >
                Yêu cầu cấp quyền / Quên MK
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-slate-500 lg:block">
              Email nhận thông báo: <span className="font-bold text-slate-700">{ADMIN_EMAIL}</span>
            </div>
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-blue-600">
              Xem web
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex border-t border-slate-100 px-4 py-2 sm:hidden">
          <Link
            href="/admin"
            className="flex-1 py-1 text-center text-xs font-semibold text-slate-700 hover:text-blue-600"
          >
            Đơn gia công
          </Link>
          <Link
            href="/admin/products"
            className="flex-1 py-1 text-center text-xs font-semibold text-slate-700 hover:text-blue-600"
          >
            Sản phẩm mẫu
          </Link>
          <Link
            href="/admin/access-requests"
            className="flex-1 py-1 text-center text-xs font-semibold text-slate-700 hover:text-blue-600"
          >
            Cấp quyền
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
