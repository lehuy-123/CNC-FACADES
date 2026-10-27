import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSampleProducts } from "@/lib/data/products";
import AdminShell from "../_components/AdminShell";
import ProductListClient from "./ProductListClient";

export const metadata: Metadata = {
  title: "Quản lý sản phẩm mẫu | Admin CNC",
};

export default function AdminProductsPage() {
  return (
    <AdminShell>
      <Suspense fallback={<p className="py-20 text-center text-slate-500">Đang tải sản phẩm mẫu...</p>}>
        <ProductsLoader />
      </Suspense>
    </AdminShell>
  );
}

async function ProductsLoader() {
  await requireAdmin();
  const products = await getSampleProducts();

  return <ProductListClient initialProducts={products} />;
}
