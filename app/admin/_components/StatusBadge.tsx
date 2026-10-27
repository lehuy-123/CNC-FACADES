import type { OrderStatus } from "@/app/generated/prisma/enums";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/orders";

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
