export type ProductItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number | null;
  dimensions: string | null;
  material?: string | null;
  imageUrl: string;
  baseAiContext?: string | null;
  cadTemplate?: any;
  createdAt?: Date;
  updatedAt?: Date;
};

export const DEFAULT_CATEGORIES = [
  "Kệ & Tủ kim loại",
  "Bàn & Khung kết cấu",
  "Hộp kỹ thuật & Vỏ tủ",
  "Pát đỡ & Chi tiết máy",
] as const;
