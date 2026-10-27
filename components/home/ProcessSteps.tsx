const steps = [
  { title: "Bạn vẽ phác thảo", desc: "Vẽ tay, vẽ trên màn hình hoặc tải ảnh lên" },
  { title: "AI thiết kế và hoàn thiện", desc: "Chuyển thành hình ảnh 3D và bản vẽ kỹ thuật" },
  { title: "Nhận bản vẽ và báo giá", desc: "Bản vẽ 2D, 3D, thông số kỹ thuật, giá dự kiến" },
  { title: "Đặt hàng sản xuất", desc: "Xác nhận thiết kế và tiến hành sản xuất" },
];

export default function ProcessSteps() {
  return (
    <section id="steps" className="bg-blue-50 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.title} className="relative text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-md shadow-blue-600/30">
              {i + 1}
            </div>
            <h3 className="mt-4 font-bold text-[#0f2a5c]">{s.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
