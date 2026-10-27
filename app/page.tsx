import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import ProductGrid from "@/components/home/ProductGrid";
import ProcessSteps from "@/components/home/ProcessSteps";
import OrderSection from "@/components/order/OrderSection";


export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-700">
      <Navbar />
      <main>
        <Hero />
        <Suspense fallback={<ProductSkeleton />}>
          <ProductGrid />
        </Suspense>
        <ProcessSteps />
        <Suspense fallback={<div className="py-20 text-center text-slate-400">Đang tải biểu mẫu...</div>}>
          <OrderSection />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function ProductSkeleton() {
  return (
    <section id="products" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-full mx-auto mb-3" />
        <div className="h-4 w-96 bg-slate-100 rounded mx-auto" />
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </section>
  );
}
