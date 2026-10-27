export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
      {/* Ảnh máy CNC chìm mờ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.12] mix-blend-multiply"
        style={{ backgroundImage: "url('/cnc-machine-bg.jpg')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(#dbe7f7 1px, transparent 1px), linear-gradient(90deg, #dbe7f7 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="inline-block rounded-full border border-blue-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
          Gia công CNC &times; Trí tuệ nhân tạo
        </span>
        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight text-[#0f2a5c] sm:text-5xl lg:text-6xl">
          Gia công CNC <span className="text-blue-600">chính xác cao</span> kết hợp AI phác thảo bản vẽ
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Từ phác thảo ý tưởng đến bản vẽ hoàn chỉnh. AI thiết kế, báo giá nhanh chóng và xưởng hiện thực hóa từng chi
          tiết.
        </p>
        <a
          href="#order"
          className="mt-10 inline-block rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-blue-600/30 transition hover:-translate-y-0.5 hover:bg-blue-700"
        >
          Tạo yêu cầu &amp; Phác thảo AI
        </a>
      </div>
    </section>
  );
}
