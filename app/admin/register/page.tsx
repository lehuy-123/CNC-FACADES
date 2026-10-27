import Link from "next/link";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 to-white px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(#dbe7f7 1px, transparent 1px), linear-gradient(90deg, #dbe7f7 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-900/10">
        <p className="text-center text-xl font-extrabold tracking-tight text-[#0f2a5c]">
          CNC <span className="text-blue-600">&amp;</span> AI Workshop
        </p>
        <h1 className="mt-2 text-center text-base font-bold text-slate-800">
          Đăng ký quyền truy cập Dashboard
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          Dành cho nhân sự / kỹ thuật viên xưởng CNC
        </p>
        <RegisterForm />
        <Link href="/" className="mt-6 block text-center text-xs text-slate-500 hover:text-blue-600">
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}
