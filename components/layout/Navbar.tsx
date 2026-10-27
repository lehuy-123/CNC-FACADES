import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-[#0f2a5c]">
          CNC <span className="text-blue-600">&amp;</span> AI Workshop
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <Link href="/" className="hover:text-blue-600">Trang chủ</Link>
          <Link href="/#products" className="hover:text-blue-600">Sản phẩm mẫu</Link>
          <Link href="/#steps" className="hover:text-blue-600">Quy trình</Link>
          <Link href="/#order" className="hover:text-blue-600">Đặt hàng AI</Link>
          <Link href="/tra-cuu" className="font-semibold text-blue-600 hover:text-blue-700">
            Tra cứu đơn hàng
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/tra-cuu"
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 md:hidden"
          >
            Tra cứu
          </Link>
          <Link
            href="/admin/login"
            className="rounded-lg border border-blue-600 px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-600 hover:text-white"
          >
            Đăng nhập Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
