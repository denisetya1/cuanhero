import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import SetupTradingAccountForm from "./SetupTradingAccountForm";

export const dynamic = "force-dynamic";

export default async function TradingAccountSetupPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { orderNumber } = await params;
  const currentPath = `/member/orders/${encodeURIComponent(orderNumber)}/setup`;

  if (!session) {
    redirect(`/member/login?ref=${encodeURIComponent(currentPath)}`);
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber, userId: session.user.id },
    select: {
      orderNumber: true,
      status: true,
      tradingAccountId: true,
      setupRequest: { select: { id: true } },
      expertAdvisor: { select: { name: true } },
      package: { select: { name: true } },
    },
  });

  if (
    !order ||
    order.status !== "PAID" ||
    order.tradingAccountId ||
    order.setupRequest
  ) {
    redirect("/member/orders");
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <Link
        href="/member/orders"
        className="inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Order List
      </Link>

      <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-[#050b18]/85 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.3)] md:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <LockKeyhole className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              {order.orderNumber}
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Setup Trading Account
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {order.expertAdvisor.name} · {order.package.name}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-xs leading-5 text-emerald-100/80">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          Your MT5 password is encrypted before storage. An administrator will
          verify the account, assign a VPS, and deploy the robot.
        </div>

        <SetupTradingAccountForm orderNumber={order.orderNumber} />
      </div>
    </section>
  );
}
