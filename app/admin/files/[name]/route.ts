import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/auth";
import { FILE_NAME_PATTERN, MIME_BY_EXT, UPLOAD_DIR } from "@/lib/uploads";

// Chỉ admin đã đăng nhập mới xem / tải được file khách upload
export async function GET(_req: Request, ctx: RouteContext<"/admin/files/[name]">) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const { name } = await ctx.params;
  if (!FILE_NAME_PATTERN.test(name)) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    const ext = path.extname(name).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
