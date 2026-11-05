export type ProductItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number | null;
  dimensions: string | null;
  material?: string | null;
  imageUrl: string;
  cadImageUrl?: string | null;
  baseAiContext?: string | null;
  cadTemplate?: any;
  createdAt?: Date;
  updatedAt?: Date;
};

export const DEFAULT_CATEGORIES = [
  "Tủ áo & Nội thất CNC",
  "Kệ & Tủ kim loại",
  "Bàn & Khung kết cấu",
  "Hộp kỹ thuật & Vỏ tủ",
  "Pát đỡ & Chi tiết máy",
] as const;
