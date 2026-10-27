import { getSampleProducts } from "@/lib/data/products";
import ProductShowcaseClient from "./ProductShowcaseClient";

export default async function ProductGrid() {
  const products = await getSampleProducts();

  return <ProductShowcaseClient products={products} />;
}
