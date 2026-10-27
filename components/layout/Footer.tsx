export default function Footer() {
  return (
    <footer id="contact" className="bg-[#0f2a5c] text-blue-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-xl font-extrabold text-white">
            CNC <span className="text-blue-400">&amp;</span> AI Workshop
          </p>
          <p className="mt-3 text-sm">Gia công CNC chính xác cao, tích hợp AI tư vấn và báo giá.</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Liên hệ</p>
          <p className="mt-3">Điện thoại: 0901 234 567</p>
          <p className="mt-1">Email: contact@cncai-workshop.vn</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Địa chỉ xưởng</p>
          <p className="mt-3">123 Đường Công Nghiệp, TP. Hồ Chí Minh</p>
          <p className="mt-1">Giờ làm việc: 8:00 - 17:30 (T2 - T7)</p>
        </div>
      </div>
      <div className="border-t border-blue-900 py-4 text-center text-xs text-blue-300">
        &copy; 2026 CNC &amp; AI Workshop. All rights reserved.
      </div>
    </footer>
  );
}
