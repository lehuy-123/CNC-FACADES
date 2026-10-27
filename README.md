# 🏗️ CNC FACADES - Nền Tảng Đặt Hàng & Báo Giá Gia Công CNC Mặt Dựng

Hệ thống web ứng dụng hiện đại hỗ trợ khách hàng tính toán chi phí sơ bộ, đặt hàng gia công CNC (mặt dựng nhôm, inox, kim loại hoa văn facade) kèm công cụ AI phác thảo ý tưởng thiết kế và hệ thống quản trị đơn hàng toàn diện.

---

## ✨ Tính Năng Nổi Bật

### 1. Dành Cho Khách Hàng
- 📐 **Báo giá gia công tức thì:** Chọn loại vật liệu (Nhôm, Inox 304, Thép...), độ dày tấm, diện tích gia công và phương án hoàn thiện (Sơn tĩnh điện, Anode, Mạ PVD) để nhận ước tính chi phí sơ bộ theo thời gian thực.
- 🎨 **Phác thảo ý tưởng với AI (AI Sketch):** Tích hợp công nghệ AI (Google Gemini Imagen 3 / Hugging Face FLUX) giúp biến ý tưởng hoặc mô tả văn bản thành hình ảnh mặt dựng hoa văn 2D/3D trực quan.
- 📁 **Tải lên bản vẽ & file thiết kế:** Hỗ trợ đính kèm bản vẽ kỹ thuật (CAD, PDF, hình ảnh thực tế).
- 🔍 **Tra cứu đơn hàng (`/tra-cuu`):** Khách hàng dễ dàng kiểm tra tiến độ gia công thông qua mã đơn hàng và số điện thoại.
- 📧 **Thông báo email tự động:** Gửi email xác nhận đặt hàng ngay lập tức kèm thông tin chi tiết qua Gmail SMTP.

### 2. Dành Cho Quản Trị Viên (`/admin`)
- 📊 **Dashboard quản trị:** Theo dõi tổng số đơn hàng, doanh thu ước tính và trạng thái gia công.
- 📑 **Quản lý đơn hàng:** Xem chi tiết từng đơn hàng, tải bản vẽ đính kèm, cập nhật trạng thái (Chờ xác nhận, Đang gia công, Hoàn thành, Đã hủy).
- 🏷️ **Quản lý sản phẩm & mẫu CNC (`/admin/products`):** Thêm, sửa, xóa mẫu hoa văn facade, upload ảnh đại diện mẫu.
- 🔐 **Bảo mật phân quyền:** Xác thực tài khoản quản trị viên với Cookie session an toàn.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend & Backend Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19, TypeScript)
- **Styling:** Tailwind CSS
- **Database & ORM:** PostgreSQL với [Prisma ORM 7](https://www.prisma.io/) (hỗ trợ Driver Adapter `@prisma/adapter-pg`)
- **Email Service:** [Nodemailer](https://nodemailer.com/) (Google App Password SMTP)
- **AI Integration:** Google Gemini API (Imagen 3) / Hugging Face API

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Clone repository
```bash
git clone https://github.com/lehuy-123/CNC-FACADES.git
cd CNC-FACADES
```

### 2. Cài đặt các gói phụ thuộc (Dependencies)
```bash
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
Mở file `.env` và điền các thông tin:
- `DATABASE_URL`: Đường dẫn kết nối PostgreSQL.
- `ADMIN_USERNAME` & `ADMIN_PASSWORD`: Thông tin đăng nhập tài khoản admin.
- `SESSION_SECRET`: Chuỗi bí mật ngẫu nhiên cho cookie session.
- `GMAIL_USER` & `GMAIL_APP_PASSWORD`: Tài khoản Gmail và App Password (16 ký tự) để gửi mail.
- `GEMINI_API_KEY`: API Key từ Google AI Studio (tùy chọn cho tính năng AI Sketch).

### 4. Đồng bộ cấu trúc Database với Prisma
```bash
# Đẩy schema lên database
npx prisma db push

# Khởi tạo dữ liệu mẫu (nếu có script seed) hoặc mở Prisma Studio xem database:
npx prisma studio
```

### 5. Khởi chạy môi trường phát triển (Development)
```bash
npm run dev
```
Mở trình duyệt truy cập: [http://localhost:3000](http://localhost:3000)

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
├── actions/             # Server Actions (Xử lý đơn hàng, AI sketch, upload...)
├── app/
│   ├── admin/          # Giao diện & chức năng Quản trị viên
│   ├── product/        # Chi tiết sản phẩm & mẫu CNC
│   ├── tra-cuu/        # Trang tra cứu đơn hàng cho khách hàng
│   ├── layout.tsx      # Layout chung của ứng dụng
│   └── page.tsx        # Trang chủ & form đặt hàng chính
├── components/         # Các React Components tái sử dụng (OrderForm, Header, Footer...)
├── lib/                # Thư viện tiện ích (Prisma client, Mailer, Hash, Format...)
├── prisma/             # Schema Prisma & cấu hình DB
├── public/             # File tĩnh (Logo, ảnh sản phẩm, svg demo...)
├── .env.example        # File mẫu cấu hình biến môi trường
└── README.md           # Tài liệu dự án
```

---

## 📦 Build & Triển Khai (Production)

Để build sản phẩm cho môi trường production:
```bash
npm run build
npm run start
```
Có thể dễ dàng deploy lên [Vercel](https://vercel.com/) hoặc VPS/Docker.

---

## 📄 License
Dự án được phân phối dưới giấy phép riêng biệt cho CNC Facades.
