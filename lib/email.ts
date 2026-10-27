import nodemailer from "nodemailer";

export const ADMIN_ALERT_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "huy01082004@gmail.com";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/** Gửi email thông báo yêu cầu Đăng ký hoặc Quên mật khẩu nhân sự */
export async function sendAccessRequestEmail(data: {
  type: "REGISTER" | "RESET";
  fullName?: string;
  phone: string;
  username: string;
}) {
  const transporter = getTransporter();
  const isRegister = data.type === "REGISTER";
  const typeText = isRegister ? "ĐĂNG KÝ TRUY CẬP DASHBOARD" : "YÊU CẦU CẤP LẠI MẬT KHẨU";

  const subject = `[CNC & AI Workshop] ${typeText} từ SĐT ${data.phone}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px;">
        <h2 style="color: #0f2a5c; margin: 0;">CNC & AI Workshop</h2>
        <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; background-color: ${
          isRegister ? "#dbeafe" : "#fef3c7"
        }; color: ${isRegister ? "#1d4ed8" : "#b45309"}; font-weight: bold; font-size: 13px; border-radius: 20px;">
          ${typeText}
        </span>
      </div>

      <div style="padding: 20px 0; color: #334155; line-height: 1.6;">
        <p>Xin chào Admin,</p>
        <p>Hệ thống vừa ghi nhận một yêu cầu cấp quyền mới từ nhân sự:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 140px;">Người yêu cầu:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${data.fullName || "—"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Số điện thoại:</td>
            <td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${data.phone}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Tài khoản đăng nhập:</td>
            <td style="padding: 8px 0; font-family: monospace; font-size: 15px; color: #0f172a; font-weight: bold;">${data.username}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Thời gian gửi:</td>
            <td style="padding: 8px 0; color: #64748b;">${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #475569;">
          <strong>Lưu ý bảo mật:</strong> Nhân sự này hiện <strong>chưa thể đăng nhập</strong>. Bạn cần đăng nhập Dashboard để bấm duyệt sinh mật khẩu, sau đó thông báo mật khẩu cho nhân sự qua số điện thoại trên.
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <a href="http://localhost:3000/admin/access-requests" style="background-color: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Vào Dashboard Phê Duyệt Ngay →
          </a>
        </div>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
        Email thông báo tự động từ hệ thống CNC & AI Workshop gửi đến ${ADMIN_ALERT_EMAIL}
      </div>
    </div>
  `;

  if (!transporter) {
    console.log("-------------------------------------------------------");
    console.log(`[EMAIL SIMULATION] Gửi tới: ${ADMIN_ALERT_EMAIL}`);
    console.log(`[EMAIL SIMULATION] Tiêu đề: ${subject}`);
    console.log(`[EMAIL SIMULATION] Chi tiết: SĐT ${data.phone} | User: ${data.username}`);
    console.log("[EMAIL SIMULATION] Chưa có GMAIL_APP_PASSWORD trong .env nên nội dung chỉ log ra terminal.");
    console.log("-------------------------------------------------------");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"CNC & AI Workshop" <${process.env.GMAIL_USER}>`,
      to: ADMIN_ALERT_EMAIL,
      subject,
      html,
    });
    console.log(`[EMAIL SENT] Đã gửi thông báo thành công tới ${ADMIN_ALERT_EMAIL}`);
  } catch (error) {
    console.error("[EMAIL ERROR] Lỗi gửi email thông báo:", error);
  }
}

/** Gửi email thông báo khi có đơn hàng mới từ khách */
export async function sendNewOrderEmail(data: {
  code: string;
  customerName: string;
  phone: string;
  requirements: string;
  hasCad: boolean;
  hasImage: boolean;
  hasAiSketch?: boolean;
  aiSketchUrl?: string;
}) {
  const transporter = getTransporter();
  const subject = `[CNC & AI Workshop] Đơn đặt hàng mới: Mã ${data.code} (${data.customerName})`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px;">
        <h2 style="color: #0f2a5c; margin: 0;">CNC & AI Workshop</h2>
        <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; background-color: #dbeafe; color: #1d4ed8; font-weight: bold; font-size: 13px; border-radius: 20px;">
          YÊU CẦU GIA CÔNG MỚI
        </span>
      </div>

      <div style="padding: 20px 0; color: #334155; line-height: 1.6;">
        <p>Xin chào Admin,</p>
        <p>Một khách hàng vừa gửi yêu cầu gia công CNC mới từ website:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 140px;">Mã đơn hàng:</td>
            <td style="padding: 8px 0; font-family: monospace; font-size: 16px; color: #1d4ed8; font-weight: bold;">${data.code}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Khách hàng:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${data.customerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Số điện thoại:</td>
            <td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${data.phone}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-weight: bold;">File đính kèm:</td>
            <td style="padding: 8px 0; color: #0f172a;">
              ${data.hasCad ? "✓ File AutoCAD (.dwg/.dxf) " : ""}
              ${data.hasImage ? "✓ Ảnh mẫu " : ""}
              ${data.hasAiSketch ? "✨ Bản phác thảo AI (Khách đã duyệt demo) " : ""}
              ${!data.hasCad && !data.hasImage && !data.hasAiSketch ? "Không có file" : ""}
            </td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 15px 0;">
          <div style="color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Nội dung yêu cầu:</div>
          <div style="color: #0f172a; margin-top: 6px; white-space: pre-wrap;">${data.requirements}</div>
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <a href="http://localhost:3000/admin" style="background-color: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Xem chi tiết đơn trong Admin →
          </a>
        </div>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
        Email thông báo tự động từ hệ thống CNC & AI Workshop gửi đến ${ADMIN_ALERT_EMAIL}
      </div>
    </div>
  `;

  if (!transporter) {
    console.log("-------------------------------------------------------");
    console.log(`[EMAIL SIMULATION] Gửi tới: ${ADMIN_ALERT_EMAIL}`);
    console.log(`[EMAIL SIMULATION] Tiêu đề: ${subject}`);
    console.log(`[EMAIL SIMULATION] Mã đơn: ${data.code} | Khách: ${data.customerName} (${data.phone})`);
    console.log("[EMAIL SIMULATION] Chưa có GMAIL_APP_PASSWORD trong .env nên nội dung chỉ log ra terminal.");
    console.log("-------------------------------------------------------");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"CNC & AI Workshop" <${process.env.GMAIL_USER}>`,
      to: ADMIN_ALERT_EMAIL,
      subject,
      html,
    });
    console.log(`[EMAIL SENT] Đã gửi thông báo đơn hàng thành công tới ${ADMIN_ALERT_EMAIL}`);
  } catch (error) {
    console.error("[EMAIL ERROR] Lỗi gửi email thông báo đơn hàng:", error);
  }
}
