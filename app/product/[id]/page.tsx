import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import OrderForm from "@/components/order/OrderForm";
import { getProductById, getSampleProducts } from "@/lib/data/products";
import { formatVND } from "@/lib/format";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return {
      title: "Không tìm thấy sản phẩm | CNC & AI Workshop",
    };
  }

  return {
    title: `${product.name} - Chi tiết & Đặt hàng theo tham số CAD | CNC & AI Workshop`,
    description: `Xem chi tiết và tùy biến kích thước bản vẽ kỹ thuật CAD cho ${product.name}. Công nghệ Parametric Design co giãn chính xác 100%.`,
  };
}

export default function ProductDetailPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <Navbar />
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetailContent params={params} />
      </Suspense>
      <Footer />
    </div>
  );
}

async function ProductDetailContent({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const allProducts = await getSampleProducts();
  const otherProducts = allProducts.filter((p) => p.id !== product.id).slice(0, 3);

  // Serialize product để loại bỏ Date object khi truyền sang Client Component OrderForm
  const serializedProduct = {
    ...product,
    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : undefined,
    updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 flex-1 space-y-12">
      {/* 1. BREADCRUMB ĐIỀU HƯỚNG */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
        <span>/</span>
        <Link href="/#products" className="hover:text-blue-600 transition">Sản phẩm mẫu</Link>
        <span>/</span>
        <span className="text-blue-700 font-bold">{product.name}</span>
      </nav>

      {/* 2. KHỐI CHI TIẾT SẢN PHẨM MẪU (PRODUCT DETAILS) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Cột trái: Hình ảnh sản phẩm chất lượng cao */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded-full bg-blue-600/90 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-xs">
                {product.category}
              </span>
            </div>

            {/* Cam kết xưởng */}
            <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-4 space-y-2 text-xs text-blue-900">
              <div className="font-bold flex items-center gap-1.5 text-blue-950">
                <span>🛡️</span>
                <span>Tiêu chuẩn gia công xưởng CNC:</span>
              </div>
              <ul className="space-y-1 text-blue-800 list-disc list-inside text-[11px]">
                <li>Dung sai cắt laser &amp; phay chấn: ±0.03 mm</li>
                <li>Mối hàn CO2 / TIG ngấu phẳng thẩm mỹ cao</li>
                <li>Sơn tĩnh điện chống rỉ sét hoặc Anode bề mặt bền bỉ</li>
                <li>Xuất kèm file AutoCAD (.dxf) chuẩn R12 khi đặt hàng</li>
              </ul>
            </div>
          </div>

          {/* Cột phải: Thông tin quy cách kỹ thuật & giá */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-700">
                Bản vẽ kỹ thuật có sẵn template
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-[#0f2a5c]">
                {product.name}
              </h1>
            </div>

            {/* Giá tham khảo */}
            <div className="flex flex-wrap items-baseline gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Đơn giá xưởng tham khảo:
              </span>
              <span className="text-2xl sm:text-3xl font-black text-blue-700">
                {product.price ? formatVND(product.price) : "Liên hệ báo giá"}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                (Giá hoàn thiện phôi + gia công hoàn chỉnh)
              </span>
            </div>

            {/* Bảng quy cách kỹ thuật chuẩn */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Quy cách kỹ thuật nguyên mẫu:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="block text-[11px] text-slate-400 font-medium">Kích thước gốc:</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {product.dimensions || "Chuẩn xưởng"}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="block text-[11px] text-slate-400 font-medium">Vật liệu phôi:</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate" title={product.material || "Thép SS400"}>
                    {product.material || "Thép kết cấu SS400"}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 col-span-2 sm:col-span-1">
                  <span className="block text-[11px] text-slate-400 font-medium">Thời gian hoàn thiện:</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                    1 - 3 ngày làm việc
                  </span>
                </div>
              </div>
            </div>

            {/* Mô tả chi tiết & kết cấu */}
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
              <h3 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                Mô tả kết cấu &amp; Công năng:
              </h3>
              <p className="text-sm text-slate-700">
                {product.description || "Gia công cơ khí chính xác theo tiêu chuẩn công nghiệp hiện đại."}
              </p>
              <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-amber-900 text-xs">
                👉 <strong>Bạn muốn thay đổi kích thước?</strong> Hãy kéo xuống phần bên dưới. Bạn có thể tự do điều chỉnh chiều dài, rộng, cao, độ dày kim loại. Động cơ <strong>Parametric Design</strong> sẽ tự động tính toán lại tỷ lệ các chi tiết và sinh bản vẽ CAD 2D chuẩn xác ngay lập tức!
              </div>
            </div>

            {/* Phím tắt cuộn xuống form tùy biến */}
            <div className="pt-2">
              <a
                href="#parametric-order"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition"
              >
                <span>⚡ Tùy biến kích thước &amp; Đặt hàng mẫu này</span>
                <span>↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KHỐI FORM ĐẶT HÀNG THEO TEMPLATE RIÊNG CỦA SẢN PHẨM NÀY */}
      <section id="parametric-order" className="scroll-mt-12 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <span className="inline-block rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-bold">
            Khuôn mẫu CAD: {product.name}
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0f2a5c]">
            Tùy biến tham số &amp; Đặt hàng theo bản vẽ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Hệ thống đã khóa bối cảnh theo khuôn mẫu <strong>{product.name}</strong>. Mọi thay đổi về kích thước sẽ được tính toán toán học không sợ AI vẽ sai lệch.
          </p>
        </div>

        {/* Form đặt hàng theo đúng product này */}
        <OrderForm product={serializedProduct as any} />
      </section>

      {/* 4. GỢI Ý CÁC SẢN PHẨM MẪU KHÁC */}
      {otherProducts.length > 0 && (
        <section className="pt-8 border-t border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">
            Xem thêm các sản phẩm mẫu khác của xưởng:
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {otherProducts.map((other) => (
              <Link
                key={other.id}
                href={`/product/${other.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs hover:border-blue-400 hover:shadow-md transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={other.imageUrl}
                  alt={other.name}
                  className="h-16 w-16 rounded-xl object-cover border border-slate-100 group-hover:scale-105 transition"
                />
                <div className="space-y-0.5 text-xs overflow-hidden">
                  <p className="font-bold text-slate-900 group-hover:text-blue-700 truncate">
                    {other.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{other.dimensions || other.category}</p>
                  <p className="font-bold text-blue-700 text-xs">
                    {other.price ? formatVND(other.price) : "Báo giá"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 animate-pulse space-y-8">
      <div className="h-6 w-48 bg-slate-200 rounded" />
      <div className="h-96 bg-slate-200 rounded-3xl" />
      <div className="h-96 bg-slate-100 rounded-3xl" />
    </div>
  );
}
