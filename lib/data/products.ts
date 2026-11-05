import { prisma } from "@/lib/prisma";
import { type ProductItem, DEFAULT_CATEGORIES } from "./product-types";

export type { ProductItem };
export { DEFAULT_CATEGORIES };

export const INITIAL_PRODUCTS: Omit<ProductItem, "id">[] = [
  {
    name: "Tủ quần áo 4 cánh có kệ góc đa năng CNC",
    category: "Tủ áo & Nội thất CNC",
    description: "Tủ áo kịch trần thiết kế hiện đại 2 buồng lớn kết hợp kệ góc trang trí 5 tầng bo cong mềm mại. Khung thùng gỗ MDF lõi xanh chống ẩm HMR dày 18mm phủ Melamine vân gỗ sồi, mặt cánh sơn bệt trắng chạy rãnh CNC quả trám sang trọng. Trang bị đầy đủ 2 suốt treo Inox oval phi 25mm, 4 ngăn kéo ray bi 3 tầng giảm chấn và khoang chứa chăn màn vali nóc tủ rộng rãi.",
    dimensions: "2115 × 600 × 2650 mm",
    material: "Gỗ MDF lõi xanh chống ẩm HMR 20mm phủ Melamine & Cánh sơn bệt trắng CNC",
    price: 14500000,
    imageUrl: "/products/tu-ao-canh-mo-hien-dai.jpg",
    cadImageUrl: "/products/tu-ao-cad-drawing.jpg",
    baseAiContext: "Tủ quần áo hiện đại kịch trần 2 buồng 4 cánh mở kết hợp kệ góc hở bo cong và hệ 4 ngăn kéo dưới. Kích thước chuẩn bản vẽ: Chiều dài L=2115mm (Kệ góc 300mm, Buồng trái 908mm, Buồng phải 908mm), Chiều rộng sâu W=600mm, Chiều cao H=2650mm, Độ dày vách T=20mm. Khi người dùng thay đổi kích thước L, W, H, T: Tỷ lệ 2 buồng treo đồ và kệ góc co giãn đối xứng toán học, giữ nguyên kết cấu suốt treo Inox, 4 ngăn kéo và đợt nóc chứa vali.",
    cadTemplate: {
      title: "Tủ quần áo 4 cánh có kệ góc đa năng CNC",
      baseDimensions: { length: 2115, width: 600, height: 2650, thickness: 20 },
      material: "Gỗ MDF lõi xanh chống ẩm HMR 18mm",
      finish: "Melamine vân gỗ sồi & Cánh sơn bệt trắng CNC quả trám",
      parts: [
        // 1. Khung thùng và đế
        { name: "Len chân đáy tủ", x: 0, y: 0, z: 20, w: 2200, h: 70, d: 560 },
        { name: "Tấm đáy tủ chính", x: 0, y: 70, z: 0, w: 2200, h: 18, d: 600 },
        { name: "Tấm nóc tủ chính", x: 0, y: 2606, z: 0, w: 2200, h: 18, d: 600 },
        { name: "Phào nóc che trần", x: 0, y: 2624, z: 0, w: 2200, h: 26, d: 600 },
        { name: "Tấm hậu tủ chống ẩm", x: 0, y: 70, z: 582, w: 2200, h: 2536, d: 18 },
        { name: "Hồi tủ phải ngoài cùng", x: 2182, y: 88, z: 18, w: 18, h: 2518, d: 564 },
        { name: "Vách ngăn giữa 2 buồng", x: 1251, y: 88, z: 18, w: 18, h: 2518, d: 564 },
        { name: "Vách ngăn kệ góc và buồng trái", x: 320, y: 88, z: 18, w: 18, h: 2518, d: 564 },

        // 2. Buồng trái (Suốt treo dài + đợt)
        { name: "Đợt ngang chia khoang nóc trái", x: 338, y: 2218, z: 18, w: 913, h: 18, d: 564 },
        { name: "Suốt treo áo dài Inox phi 25mm buồng trái", x: 338, y: 2120, z: 290, w: 913, h: 25, d: 25 },
        { name: "Đợt ngang chia tầng giữa buồng trái", x: 338, y: 920, z: 18, w: 913, h: 18, d: 564 },
        { name: "Đợt ngang chia ngăn đáy buồng trái", x: 338, y: 494, z: 18, w: 913, h: 18, d: 564 },

        // 3. Buồng phải (Suốt treo ngắn + 4 ngăn kéo)
        { name: "Đợt ngang chia khoang nóc phải", x: 1269, y: 2218, z: 18, w: 913, h: 18, d: 564 },
        { name: "Suốt treo áo sơ mi Inox phi 25mm buồng phải", x: 1269, y: 2120, z: 290, w: 913, h: 25, d: 25 },
        { name: "Đợt ngang nóc cụm ngăn kéo", x: 1269, y: 920, z: 18, w: 913, h: 18, d: 564 },
        { name: "Vách dọc chia 2 cột ngăn kéo", x: 1716, y: 88, z: 18, w: 18, h: 832, d: 564 },
        { name: "Đợt ngang chia tầng ngăn kéo", x: 1269, y: 494, z: 18, w: 913, h: 18, d: 564 },

        // 4. Kệ góc hở trái
        { name: "Hộc tủ đáy kệ góc", x: 0, y: 88, z: 18, w: 320, h: 406, d: 564 },
        { name: "Cánh mở hộc đáy kệ góc", x: 0, y: 88, z: 0, w: 320, h: 406, d: 18 },
        { name: "Đợt kệ góc hở tầng 1", x: 0, y: 850, z: 18, w: 320, h: 18, d: 564 },
        { name: "Đợt kệ góc hở tầng 2", x: 0, y: 1250, z: 18, w: 320, h: 18, d: 564 },
        { name: "Đợt kệ góc hở tầng 3", x: 0, y: 1650, z: 18, w: 320, h: 18, d: 564 },
        { name: "Đợt kệ góc hở tầng 4", x: 0, y: 2050, z: 18, w: 320, h: 18, d: 564 },
        { name: "Đợt kệ góc hở tầng 5 (nóc kệ)", x: 0, y: 2350, z: 18, w: 320, h: 18, d: 564 },

        // 5. Cụm 4 ngăn kéo
        { name: "Mặt ngăn kéo dưới trái", x: 1273, y: 92, z: 0, w: 439, h: 398, d: 18 },
        { name: "Mặt ngăn kéo dưới phải", x: 1738, y: 92, z: 0, w: 439, h: 398, d: 18 },
        { name: "Mặt ngăn kéo trên trái", x: 1273, y: 498, z: 0, w: 439, h: 418, d: 18 },
        { name: "Mặt ngăn kéo trên phải", x: 1738, y: 498, z: 0, w: 439, h: 418, d: 18 },

        // 6. Cánh mở màu trắng
        { name: "Cánh lật nóc buồng trái 1", x: 338, y: 2236, z: 0, w: 452, h: 370, d: 18 },
        { name: "Cánh lật nóc buồng trái 2", x: 795, y: 2236, z: 0, w: 452, h: 370, d: 18 },
        { name: "Cánh lật nóc buồng phải 1", x: 1269, y: 2236, z: 0, w: 452, h: 370, d: 18 },
        { name: "Cánh lật nóc buồng phải 2", x: 1726, y: 2236, z: 0, w: 452, h: 370, d: 18 },
        { name: "Cánh mở đứng dài buồng trái 1", x: 338, y: 88, z: 0, w: 452, h: 2126, d: 18 },
        { name: "Cánh mở đứng dài buồng trái 2", x: 795, y: 88, z: 0, w: 452, h: 2126, d: 18 },
        { name: "Cánh mở đứng buồng phải 1", x: 1269, y: 920, z: 0, w: 452, h: 1294, d: 18 },
        { name: "Cánh mở đứng buồng phải 2", x: 1726, y: 920, z: 0, w: 452, h: 1294, d: 18 },
      ],
      holes: [
        { x: 338, y: 2120, z: 290, diameter: 25, axis: "x" },
        { x: 2182, y: 2120, z: 290, diameter: 25, axis: "x" },
        { x: 1251, y: 2606, z: 290, diameter: 15, axis: "y" },
        { x: 1251, y: 70, z: 290, diameter: 15, axis: "y" },
      ],
      notes: [
        "Ván MDF lõi xanh chống ẩm HMR Thái Lan dày 18mm phủ Melamine vân gỗ sồi",
        "Mặt cánh sơn bệt trắng cao cấp chạy rãnh CNC quả trám tinh xảo",
        "Cắt xẻ và khoan lỗ cam chốt chính xác trên máy CNC Nesting 4 đầu",
        "Trang bị 2 suốt treo Inox oval phi 25mm và 4 bộ ray trượt bi 3 tầng giảm chấn",
        "Bản lề hơi thủy lực giảm chấn Inox 304 chống rỉ sét",
        "Kệ góc hở 5 tầng bo tròn bán kính R320 chống va chạm an toàn",
      ],
    },
  },
  {
    name: "Pát đỡ tam giác chịu lực CNC",
    category: "Pát đỡ & Chi tiết máy",
    description: "Pát đỡ chữ L thép tấm 4.0mm kết hợp gân tam giác tăng cứng khoét 3 lỗ thoát trọng lượng phong cách cơ khí công nghiệp. Sơn tĩnh điện sần đen cao cấp chống rỉ sét, chịu tải trọng lớn lên đến 80kg/cặp, liên kết bắt vít nở tường bê tông và bắt vít đợt kệ phẳng.",
    dimensions: "300 × 50 × 200 mm",
    material: "Thép kết cấu SS400 dày 4.0mm sơn tĩnh điện đen sần",
    price: 180000,
    imageUrl: "/products/pat-do-tam-giac.png",
    baseAiContext: "Pát đỡ / Giá đỡ chịu lực dạng chữ L có gân tăng cứng tam giác khoét 3 lỗ tròn cơ khí (Lightening holes). Gồm: 01 bản thép ngang đỡ kệ (Dài L, Rộng W, Dày T), 01 bản thép dọc gắn tường (Cao H, Rộng W, Dày T) và 01 gân tam giác tăng cứng ở giữa dày T. Khi người dùng thay đổi kích thước (Dài L, Rộng W, Cao H, Dày T): Các bản thép co giãn theo hệ tham số, 3 lỗ tròn trên gân tam giác tự động thu phóng và phân bổ đều dọc theo đường chéo hypotenuse. Giữ nguyên nguyên lý kết cấu cơ khí chính xác.",
    cadTemplate: {
      title: "Pát đỡ tam giác chịu lực CNC",
      baseDimensions: { length: 300, width: 50, height: 200, thickness: 4 },
      material: "Thép tấm SS400 dày 4.0mm",
      finish: "Sơn tĩnh điện sần đen mờ cao cấp",
      parts: [
        { name: "Bản thép ngang đỡ kệ", x: 0, y: 196, z: 0, w: 300, h: 4, d: 50 },
        { name: "Bản thép dọc áp tường", x: 0, y: 0, z: 0, w: 4, h: 200, d: 50 },
        { name: "Gân tam giác tăng cứng", x: 4, y: 0, z: 23, w: 296, h: 196, d: 4, shape: "triangle" }
      ],
      holes: [
        { x: 4, y: 170, z: 25, diameter: 8, axis: "x" },
        { x: 4, y: 30, z: 25, diameter: 8, axis: "x" },
        { x: 50, y: 200, z: 25, diameter: 6, axis: "y" },
        { x: 270, y: 200, z: 25, diameter: 6, axis: "y" },
        { x: 75, y: 130, z: 25, diameter: 45, axis: "z" },
        { x: 150, y: 85, z: 25, diameter: 30, axis: "z" },
        { x: 220, y: 45, z: 25, diameter: 18, axis: "z" }
      ],
      notes: [
        "Cắt laser fiber độ chính xác ±0.03mm",
        "Hàn TIG ngấu phẳng gân tăng cứng chịu tải 80kg",
        "3 lỗ tròn thoát trọng lượng thẩm mỹ đường kính 45mm, 30mm, 18mm",
        "Khoét 2 lỗ fi 8mm liên kết tường và 2 lỗ fi 6mm bắt đợt kệ"
      ]
    }
  },
  {
    name: "Kệ treo tường cơ khí",
    category: "Kệ & Tủ kim loại",
    description: "Kệ treo thép tấm 2mm chấn CNC góc chuẩn, sơn tĩnh điện sần cao cấp, pát chịu tải 30kg. Khoét lỗ laser phong cách công nghiệp, dễ dàng bắt vít cố định vào tường bê tông.",
    dimensions: "800 × 300 × 200 mm",
    material: "Thép tấm cán nguội SS400 dày 2.0mm sơn tĩnh điện",
    price: 1200000,
    imageUrl: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800&auto=format&fit=crop&q=80",
    baseAiContext: "Kệ treo tường cơ khí dập chấn tấm thép SS400. Cấu trúc nguyên khối gồm: 01 tấm đáy ngang chịu lực (L x T x W), 01 thành chặn lưng tựa tường có lỗ bắt nở (L x H x T), 02 pát hồi chịu lực tam giác hai bên (T x H x W). Khi khách hàng thay đổi kích thước Dài L, Rộng W, Cao H, Dày T: Không được thay đổi dạng hình học cơ bản, tính toán lại tỷ lệ các tấm và tọa độ tương ứng chính xác theo template.",
    cadTemplate: {
      title: "Kệ treo tường cơ khí thép tấm chấn CNC",
      baseDimensions: { length: 800, width: 300, height: 200, thickness: 2 },
      material: "Thép tấm SS400 dày 2.0mm",
      finish: "Sơn tĩnh điện sần cao cấp",
      parts: [
        { name: "Mặt đáy đỡ đồ", x: 0, y: 0, z: 0, w: 800, h: 2, d: 300 },
        { name: "Thành chặn lưng bắt tường", x: 0, y: 2, z: 298, w: 800, h: 198, d: 2 },
        { name: "Pát gân hồi trái chịu lực", x: 0, y: 2, z: 0, w: 2, h: 198, d: 298 },
        { name: "Pát gân hồi phải chịu lực", x: 798, y: 2, z: 0, w: 2, h: 198, d: 298 }
      ],
      holes: [
        { x: 100, y: 140, z: 300, diameter: 8, axis: "z" },
        { x: 700, y: 140, z: 300, diameter: 8, axis: "z" }
      ],
      notes: [
        "Chấn gấp CNC góc 90 độ nguyên khối",
        "Pát tăng cứng hàn ngấu phẳng mài nhẵn",
        "Khoét 2 lỗ fi 8mm liên kết tường bê tông"
      ]
    }
  },
  {
    name: "Kệ để dép 4 tầng thép hộp",
    category: "Kệ & Tủ kim loại",
    description: "Kệ để giày dép đứng sàn 4 tầng nan thoáng chống bụi, chân đế đệm cao su êm ái chống trầy sàn. Mối hàn CO2 ngấu phẳng mịn, xử lý bề mặt nhẵn bóng thẩm mỹ cao.",
    dimensions: "800 × 300 × 800 mm",
    material: "Thép hộp mạ kẽm 20×20mm dày 1.2mm",
    price: 850000,
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&auto=format&fit=crop&q=80",
    baseAiContext: "Kệ giày dép 4 tầng đứng sàn khung thép hộp. Cấu trúc gồm: 4 cột đứng tiếp đất tại 4 góc và 4 đợt để phẳng phân bổ đều theo chiều cao. Đứng độc lập trên mặt sàn không dùng pát treo tường.",
    cadTemplate: {
      title: "Kệ để dép 4 tầng thép hộp",
      baseDimensions: { length: 800, width: 300, height: 800, thickness: 20 },
      material: "Thép hộp 20x20 dày 1.2mm",
      finish: "Sơn tĩnh điện đen cát",
      parts: [
        { name: "Chân trụ trước trái", x: 0, y: 0, z: 0, w: 20, h: 800, d: 20 },
        { name: "Chân trụ trước phải", x: 780, y: 0, z: 0, w: 20, h: 800, d: 20 },
        { name: "Chân trụ sau trái", x: 0, y: 0, z: 280, w: 20, h: 800, d: 20 },
        { name: "Chân trụ sau phải", x: 780, y: 0, z: 280, w: 20, h: 800, d: 20 },
        { name: "Đợt để tầng 1", x: 20, y: 60, z: 0, w: 760, h: 15, d: 300 },
        { name: "Đợt để tầng 2", x: 20, y: 300, z: 0, w: 760, h: 15, d: 300 },
        { name: "Đợt để tầng 3", x: 20, y: 540, z: 0, w: 760, h: 15, d: 300 },
        { name: "Đợt để tầng 4 (Mặt trên)", x: 20, y: 780, z: 0, w: 760, h: 15, d: 300 }
      ],
      holes: [],
      notes: ["Hàn CO2 giấu mối tinh tế", "Chân đế bọc nút cao su chống trầy nền"]
    }
  },
  {
    name: "Bàn làm việc chân sắt mặt gỗ",
    category: "Bàn & Khung kết cấu",
    description: "Khung thép hộp 40x40 dày 1.4mm hàn ngấu mài phẳng kết hợp mặt gỗ sồi tự nhiên bo góc CNC. Chân tăng chỉnh chiều cao chống bập bênh trên mọi bề mặt sàn.",
    dimensions: "1200 × 600 × 750 mm",
    material: "Thép hộp 40×40mm sơn tĩnh điện đen cát & Gỗ sồi ghép thanh",
    price: 2200000,
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80",
    baseAiContext: "Bàn làm việc khung sắt hàn kết cấu kết hợp mặt gỗ tự nhiên. Gồm hệ 4 chân trụ góc hộp 40x40, hệ 4 thanh giằng đà trên đỡ mặt bàn, và 1 mặt bàn gỗ dày 25mm.",
    cadTemplate: {
      title: "Bàn làm việc khung thép hộp mặt gỗ",
      baseDimensions: { length: 1200, width: 600, height: 750, thickness: 40 },
      material: "Khung thép 40x40 kết hợp gỗ sồi",
      finish: "Sơn tĩnh điện đen cát & PU mờ gỗ",
      parts: [
        { name: "Chân bàn trước trái", x: 0, y: 0, z: 0, w: 40, h: 725, d: 40 },
        { name: "Chân bàn trước phải", x: 1160, y: 0, z: 0, w: 40, h: 725, d: 40 },
        { name: "Chân bàn sau trái", x: 0, y: 0, z: 560, w: 40, h: 725, d: 40 },
        { name: "Chân bàn sau phải", x: 1160, y: 0, z: 560, w: 40, h: 725, d: 40 },
        { name: "Giằng ngang trước", x: 40, y: 685, z: 0, w: 1120, h: 40, d: 40 },
        { name: "Giằng ngang sau", x: 40, y: 685, z: 560, w: 1120, h: 40, d: 40 },
        { name: "Giằng hồi trái", x: 0, y: 685, z: 40, w: 40, h: 40, d: 520 },
        { name: "Giằng hồi phải", x: 1160, y: 685, z: 40, w: 40, h: 40, d: 520 },
        { name: "Mặt bàn gỗ sồi", x: 0, y: 725, z: 0, w: 1200, h: 25, d: 600 }
      ],
      holes: [],
      notes: ["Gia công khoan lỗ pát bắt ốc chìm liên kết gỗ", "Chân tăng đơ cao su điều chỉnh cao độ"]
    }
  },
  {
    name: "Kệ góc nhôm CNC",
    category: "Kệ & Tủ kim loại",
    description: "Kệ góc 3 tầng khung nhôm định hình Anodize đen mờ, tích hợp rãnh LED hắt sáng tinh tế. Khung nhôm gia công cắt góc 45 độ chuẩn xác, liên kết bằng ke chìm không lộ ốc.",
    dimensions: "400 × 400 × 600 mm",
    material: "Nhôm 6061 định hình & Anode đen chống xước",
    price: 1500000,
    imageUrl: "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=800&auto=format&fit=crop&q=80",
    baseAiContext: "Kệ góc tam giác đa tầng khung nhôm định hình. Gồm các trụ đứng góc nhôm và các tấm đợt góc tam giác CNC.",
    cadTemplate: {
      title: "Kệ góc nhôm định hình CNC",
      baseDimensions: { length: 400, width: 400, height: 600, thickness: 20 },
      material: "Nhôm định hình 6061",
      finish: "Anode đen mờ chống xước",
      parts: [
        { name: "Cột đứng góc sau", x: 0, y: 0, z: 380, w: 20, h: 600, d: 20 },
        { name: "Cột đứng cánh trái", x: 0, y: 0, z: 0, w: 20, h: 600, d: 20 },
        { name: "Cột đứng cánh phải", x: 380, y: 0, z: 380, w: 20, h: 600, d: 20 },
        { name: "Tầng đợt đáy", x: 0, y: 40, z: 0, w: 400, h: 10, d: 400 },
        { name: "Tầng đợt giữa", x: 0, y: 310, z: 0, w: 400, h: 10, d: 400 },
        { name: "Tầng đợt trên", x: 0, y: 580, z: 0, w: 400, h: 10, d: 400 }
      ],
      holes: [],
      notes: ["Cắt mòi nhôm góc 45 độ bằng máy cắt 2 đầu CNC", "Ke góc chìm liên kết lục giác"]
    }
  },
  {
    name: "Sào phơi đồ thông minh Inox 304",
    category: "Bàn & Khung kết cấu",
    description: "Ống Inox 304 phi 32mm sáng bóng chống han gỉ thời tiết, chân đế chữ H chống lật vững chắc. Thiết kế lắp ghép mô-đun tiện lợi đóng gói vận chuyển.",
    dimensions: "1500 × 500 × 1600 mm",
    material: "Inox SUS 304 phi 32mm dày 1.2mm đánh bóng sọc hairline",
    price: 950000,
    imageUrl: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&auto=format&fit=crop&q=80",
    baseAiContext: "Sào phơi đồ Inox thông minh chân chữ H. Gồm 2 chân đế chữ H tiếp sàn, 2 cột đứng tròn và xà treo trên cùng.",
    cadTemplate: {
      title: "Sào phơi đồ thông minh Inox 304",
      baseDimensions: { length: 1500, width: 500, height: 1600, thickness: 30 },
      material: "Inox 304 phi 32mm",
      finish: "Đánh bóng Hairline chống xước",
      parts: [
        { name: "Chân đế tiếp sàn trái", x: 40, y: 0, z: 0, w: 30, h: 30, d: 500 },
        { name: "Chân đế tiếp sàn phải", x: 1430, y: 0, z: 0, w: 30, h: 30, d: 500 },
        { name: "Cột đứng chính trái", x: 40, y: 30, z: 235, w: 30, h: 1540, d: 30 },
        { name: "Cột đứng chính phải", x: 1430, y: 30, z: 235, w: 30, h: 1540, d: 30 },
        { name: "Xà treo trên cùng", x: 0, y: 1570, z: 235, w: 1500, h: 30, d: 30 }
      ],
      holes: [],
      notes: ["Hàn TIG bảo vệ khí Argon không xỉ", "Chân đế chống lật an toàn tải 35kg"]
    }
  },
  {
    name: "Hộp ốp nhôm / Hộp kỹ thuật",
    category: "Hộp kỹ thuật & Vỏ tủ",
    description: "Hộp nhôm tấm 5052 dày 2.5mm phay rãnh tản nhiệt CNC, xử lý bề mặt anode chống oxy hóa. Khoét lỗ cổng kết nối nguồn, quạt gió tản nhiệt theo bản vẽ điện tử.",
    dimensions: "400 × 300 × 150 mm",
    material: "Nhôm tấm A5052 dày 2.5mm cắt laser & chấn CNC",
    price: 850000,
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
    baseAiContext: "Hộp kỹ thuật nhôm chấn kín. Gồm đáy hộp, 4 thành hộp bao quanh và nắp đậy mặt trên, có thể khoét thêm lỗ cổng nguồn hoặc dây cáp.",
    cadTemplate: {
      title: "Hộp kỹ thuật nhôm chấn CNC",
      baseDimensions: { length: 400, width: 300, height: 150, thickness: 2.5 },
      material: "Nhôm tấm A5052 dày 2.5mm",
      finish: "Anode hóa bề mặt",
      parts: [
        { name: "Đáy hộp nhôm", x: 0, y: 0, z: 0, w: 400, h: 2.5, d: 300 },
        { name: "Thành hộp trước", x: 0, y: 2.5, z: 0, w: 400, h: 145, d: 2.5 },
        { name: "Thành hộp sau", x: 0, y: 2.5, z: 297.5, w: 400, h: 145, d: 2.5 },
        { name: "Thành hộp trái", x: 0, y: 2.5, z: 2.5, w: 2.5, h: 145, d: 295 },
        { name: "Thành hộp phải", x: 397.5, y: 2.5, z: 2.5, w: 2.5, h: 145, d: 295 },
        { name: "Nắp hộp kỹ thuật", x: 0, y: 147.5, z: 0, w: 400, h: 2.5, d: 300 }
      ],
      holes: [
        { x: 200, y: 75, z: 300, diameter: 25, axis: "z" }
      ],
      notes: ["Cắt laser fiber chính xác ±0.05mm", "Khoét lỗ luồn cáp nguồn fi 25mm"]
    }
  },
  {
    name: "Vỏ tủ điện công nghiệp CNC",
    category: "Hộp kỹ thuật & Vỏ tủ",
    description: "Vỏ tủ điện kín nước IP65, khoét lỗ đồng hồ đo và công tắc bằng máy đột laser CNC độ chuẩn cao. Bản lề chìm chắc chắn, khóa tay nắm gạt tiêu chuẩn công nghiệp.",
    dimensions: "600 × 400 × 200 mm",
    material: "Thép tấm cán nóng SS400 1.5mm sơn tĩnh điện màu ghi RAL 7035",
    price: 1350000,
    imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80",
    baseAiContext: "Vỏ tủ điện công nghiệp chấn CNC kín nước IP65. Gồm thân vỏ chấn gấp mép, cánh cửa bản lề chìm và pát gá tấm đáy kỹ thuật.",
    cadTemplate: {
      title: "Vỏ tủ điện công nghiệp CNC",
      baseDimensions: { length: 400, width: 200, height: 600, thickness: 1.5 },
      material: "Thép tấm cán nguội 1.5mm",
      finish: "Sơn tĩnh điện ghi sần RAL 7035",
      parts: [
        { name: "Thân vỏ tủ chính", x: 0, y: 0, z: 0, w: 400, h: 600, d: 200 },
        { name: "Cánh cửa mở bản lề", x: 0, y: 0, z: 0, w: 400, h: 600, d: 1.5 },
        { name: "Tấm gá đáy thiết bị", x: 20, y: 20, z: 20, w: 360, h: 2, d: 160 }
      ],
      holes: [
        { x: 200, y: 50, z: 100, diameter: 30, axis: "y" }
      ],
      notes: ["Bản lề chìm góc mở 110 độ", "Lỗ luồn cáp điện có gioăng cao su làm kín"]
    }
  },
  {
    name: "Pát đỡ chịu lực CNC",
    category: "Pát đỡ & Chi tiết máy",
    description: "Pát đỡ thép SS400 dày 8mm cắt plasma CNC kết hợp phay bo cạnh, khoét lỗ giảm trọng lượng. Khả năng chịu tải kéo uốn lớn dùng cho kết cấu dầm khung máy.",
    dimensions: "300 × 200 × 8 mm",
    material: "Thép kết cấu SS400 dày 8.0mm mạ kẽm nhúng nóng",
    price: 250000,
    imageUrl: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80",
    baseAiContext: "Pát đỡ chịu lực kết cấu thép tấm dầy cắt CNC plasma/laser. Gồm bản thép phẳng chịu lực và các lỗ bulong cố định dầm.",
    cadTemplate: {
      title: "Pát đỡ chịu lực kết cấu",
      baseDimensions: { length: 300, width: 200, height: 80, thickness: 8 },
      material: "Thép kết cấu SS400 dày 8.0mm",
      finish: "Mạ kẽm nhúng nóng",
      parts: [
        { name: "Bản đáy pát chịu lực", x: 0, y: 0, z: 0, w: 300, h: 8, d: 200 },
        { name: "Gân tăng cứng đứng", x: 146, y: 8, z: 0, w: 8, h: 72, d: 200 }
      ],
      holes: [
        { x: 50, y: 4, z: 50, diameter: 14, axis: "y" },
        { x: 250, y: 4, z: 50, diameter: 14, axis: "y" },
        { x: 50, y: 4, z: 150, diameter: 14, axis: "y" },
        { x: 250, y: 4, z: 150, diameter: 14, axis: "y" }
      ],
      notes: ["Cắt Plasma CNC chính xác góc cạnh", "Khoét 4 lỗ bulong neo M12"]
    }
  },
  {
    name: "Mặt bích định tâm Inox 304",
    category: "Pát đỡ & Chi tiết máy",
    description: "Gia công tiện phay CNC mặt bích tròn 4 lỗ bulong M10 đối xứng, dung sai kỹ thuật ±0.03mm. Rãnh phay gờ lắp gioăng làm kín O-ring chịu áp lực cao.",
    dimensions: "Phi 250 × 16 mm",
    material: "Inox SUS 304 nguyên khối tiện phay CNC chính xác",
    price: 680000,
    imageUrl: "https://images.unsplash.com/photo-1618090584126-129cd1f3fabb?w=800&auto=format&fit=crop&q=80",
    baseAiContext: "Mặt bích tròn cơ khí gia công tiện phay CNC. Gồm đĩa tròn và 4 lỗ bắt bulong phân bổ tròn đều.",
    cadTemplate: {
      title: "Mặt bích định tâm Inox 304",
      baseDimensions: { length: 250, width: 250, height: 16, thickness: 16 },
      material: "Inox SUS 304",
      finish: "Tiện bóng cơ khí chính xác",
      parts: [
        { name: "Thân đĩa bích tròn chính", x: 0, y: 0, z: 0, w: 250, h: 16, d: 250 }
      ],
      holes: [
        { x: 125, y: 8, z: 125, diameter: 50, axis: "y" },
        { x: 45, y: 8, z: 125, diameter: 12, axis: "y" },
        { x: 205, y: 8, z: 125, diameter: 12, axis: "y" },
        { x: 125, y: 8, z: 45, diameter: 12, axis: "y" },
        { x: 125, y: 8, z: 205, diameter: 12, axis: "y" }
      ],
      notes: ["Lỗ tâm phi 50mm gia công H7 dung sai ±0.02mm", "4 lỗ bulong M10 chia đều góc 90 độ"]
    }
  }
];

/**
 * Kiểm tra cấu hình kết nối database có hợp lệ hay đang dùng dummy config
 */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("username:password@localhost:5432") || url.trim() === "") {
    return false;
  }
  return true;
}

/**
 * Tự động tạo hoặc đồng bộ dữ liệu mẫu khởi tạo vào database
 */
export async function seedProductsIfEmpty(): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    for (const p of INITIAL_PRODUCTS) {
      const existing = await prisma.product.findFirst({
        where: { name: p.name },
      });
      if (!existing) {
        await prisma.product.create({
          data: {
            name: p.name,
            category: p.category,
            description: p.description,
            price: p.price,
            dimensions: p.dimensions,
            material: p.material,
            imageUrl: p.imageUrl,
            baseAiContext: p.baseAiContext,
            cadTemplate: p.cadTemplate as any,
          },
        });
      } else {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            imageUrl: p.imageUrl,
            baseAiContext: p.baseAiContext,
            cadTemplate: p.cadTemplate as any,
          },
        });
      }
    }
  } catch (err) {
    console.warn("[Products] Seed check error:", err);
  }
}

/**
 * Lấy danh sách toàn bộ sản phẩm mẫu từ Database (hoặc danh sách khởi tạo mặc định)
 */
export async function getSampleProducts(): Promise<ProductItem[]> {
  if (!isDatabaseConfigured()) {
    return INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `seed-${idx + 1}` })) as unknown as ProductItem[];
  }

  try {
    await seedProductsIfEmpty();
    const list = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    if (list && list.length > 0) {
      return list as unknown as ProductItem[];
    }
    return INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `seed-${idx + 1}` })) as unknown as ProductItem[];
  } catch (err) {
    console.warn("[Products] Database not available, fallback to initial products:", (err as Error)?.message || err);
    return INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `seed-${idx + 1}` })) as unknown as ProductItem[];
  }
}

/**
 * Lấy chi tiết 1 sản phẩm theo ID
 */
export async function getProductById(id: string): Promise<ProductItem | null> {
  if (!id) return null;

  // 1. Nếu id có dạng seed-1, seed-2... trả về trực tiếp từ INITIAL_PRODUCTS
  if (id.startsWith("seed-")) {
    const match = id.match(/^seed-(\d+)$/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < INITIAL_PRODUCTS.length) {
        return { ...INITIAL_PRODUCTS[idx], id } as unknown as ProductItem;
      }
    }
    const found = INITIAL_PRODUCTS.find((p) => (p as any).id === id);
    if (found) return { ...found, id } as unknown as ProductItem;
  }

  // 2. Nếu là UUID hợp lệ và database đã sẵn sàng, truy vấn DB
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid && isDatabaseConfigured()) {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
      });
      if (product) return product as unknown as ProductItem;
    } catch (err) {
      console.warn("[Products] Error fetching product by UUID from DB:", err);
    }
  }

  // 3. Fallback: tìm trong INITIAL_PRODUCTS theo index hoặc tên
  const fallbackIdx = INITIAL_PRODUCTS.findIndex((_, idx) => `seed-${idx + 1}` === id);
  if (fallbackIdx >= 0) {
    return { ...INITIAL_PRODUCTS[fallbackIdx], id: `seed-${fallbackIdx + 1}` } as unknown as ProductItem;
  }

  const byName = INITIAL_PRODUCTS.find((p) => p.name === id);
  if (byName) {
    return { ...byName, id } as unknown as ProductItem;
  }

  return null;
}
