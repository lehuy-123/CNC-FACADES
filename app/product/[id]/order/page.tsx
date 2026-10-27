import { Suspense } from "react";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProductOrderRedirectPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Đang chuyển hướng...</div>}>
      <RedirectExecutor params={params} />
    </Suspense>
  );
}

async function RedirectExecutor({ params }: Props) {
  const { id } = await params;
  redirect(`/product/${id}#parametric-order`);
  return null;
}
