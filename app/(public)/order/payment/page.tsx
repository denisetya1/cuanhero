import { auth } from "@/lib/auth";
import PaymentCountdown from "@/components/PaymentCountdown";
import prisma from "@/lib/prisma";
import {
  CheckCircle2,
  Clock3,
  Download,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import CopyPaymentNumber from "../../components/CopyPaymentNumber";
import OrderPaymentStatus from "../../components/OrderPaymentStatus";

export const dynamic = "force-dynamic";

const statusConfig = {
  PAID: {
    title: "Pembayaran berhasil",
    description:
      "Pembayaran sudah terkonfirmasi. Tim CuanHero akan melanjutkan proses aktivasi order Anda.",
    icon: CheckCircle2,
    color: "text-emerald-300",
    background: "bg-emerald-400/10",
  },
  PENDING: {
    title: "Menunggu konfirmasi pembayaran",
    description:
      "Jika pembayaran baru saja dilakukan, status akan diperbarui otomatis setelah callback iPaymu diterima.",
    icon: Clock3,
    color: "text-amber-300",
    background: "bg-amber-400/10",
  },
  FAILED: {
    title: "Pembayaran belum berhasil",
    description: "Silakan kembali ke checkout dan buat pembayaran baru.",
    icon: XCircle,
    color: "text-red-300",
    background: "bg-red-400/10",
  },
  EXPIRED: {
    title: "Pembayaran kedaluwarsa",
    description: "Silakan kembali ke checkout dan buat pembayaran baru.",
    icon: XCircle,
    color: "text-red-300",
    background: "bg-red-400/10",
  },
  CANCELLED: {
    title: "Pembayaran dibatalkan",
    description: "Silakan kembali ke checkout jika ingin melanjutkan order.",
    icon: XCircle,
    color: "text-red-300",
    background: "bg-red-400/10",
  },
} as const;

export default async function OrderPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const params = await searchParams;
  const orderNumber = String(
    Array.isArray(params.order) ? params.order[0] : params.order || "",
  ).trim();
  const currentPath = `/order/payment?order=${encodeURIComponent(orderNumber)}`;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(`/member/login?ref=${encodeURIComponent(currentPath)}`);
  }

  const [order, paymentSettings] = await Promise.all([
    prisma.order.findFirst({
      where: { orderNumber, userId: session.user.id },
      select: {
        orderNumber: true,
        amount: true,
        status: true,
        paymentProvider: true,
        paymentMethod: true,
        paymentChannel: true,
        paymentNumber: true,
        paymentName: true,
        expiresAt: true,
        tradingAccount: { select: { accountId: true } },
        expertAdvisor: { select: { name: true } },
        package: { select: { name: true } },
      },
    }),
    prisma.appSetting.findUnique({
      where: { id: 1 },
      select: { whatsappNumber: true, staticQrisImage: true },
    }),
  ]);

  if (!order) redirect("/order");

  const config =
    statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
  const Icon = config.icon;
  const currencyFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
  const baseAmount = Number(order.amount);
  const amount = currencyFormatter.format(baseAmount);
  const normalizedPaymentMethod = order.paymentMethod?.toLowerCase() || "";
  const isQris = normalizedPaymentMethod.includes("qris");
  const isStaticQris = order.paymentProvider === "STATIC_QRIS";
  let qrCodeDataUrl = "";

  if (order.status === "PENDING" && isStaticQris) {
    qrCodeDataUrl = paymentSettings?.staticQrisImage || "";
  } else if (order.status === "PENDING" && isQris && order.paymentNumber) {
    try {
      qrCodeDataUrl = order.paymentNumber.startsWith("data:image/")
        ? order.paymentNumber
        : await QRCode.toDataURL(order.paymentNumber, {
            width: 320,
            margin: 2,
            errorCorrectionLevel: "M",
          });
    } catch (error) {
      console.error("IPAYMU_QRIS_RENDER_ERROR:", error);
    }
  }
  const qrisImageType =
    qrCodeDataUrl.match(/^data:image\/(png|jpeg|webp);base64,/)?.[1] || "png";
  const qrisFileExtension = qrisImageType === "jpeg" ? "jpg" : qrisImageType;

  const whatsappNumber =
    paymentSettings?.whatsappNumber.replace(/\D/g, "") || "";
  const confirmationMessage = [
    "Halo Admin CuanHero, saya sudah melakukan pembayaran QRIS.",
    "",
    `Order: ${order.orderNumber}`,
    `Produk: ${order.expertAdvisor.name} — ${order.package.name}`,
    `Total: ${amount}`,
    "",
    "Mohon bantu verifikasi pembayaran saya.",
  ].join("\n");
  const confirmationHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(confirmationMessage)}`
    : "";

  const expiresAt = order.expiresAt
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(order.expiresAt)
    : null;

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-12 md:px-6">
      <div className="w-full rounded-2xl border border-cyan-400/20 bg-slate-950/75 p-6 text-center shadow-[0_18px_60px_rgba(0,0,0,0.35)] md:p-10">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${config.background} ${config.color}`}
        >
          <Icon className="h-8 w-8" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
          {order.orderNumber}
        </p>
        <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">
          {config.title}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
          {order.status === "PENDING" && isStaticQris
            ? "Scan QRIS berikut, selesaikan pembayaran, lalu konfirmasikan kepada admin melalui WhatsApp."
            : config.description}
        </p>

        {order.status === "PENDING" && order.expiresAt ? (
          <div className="mt-5 flex justify-center">
            <PaymentCountdown expiresAt={order.expiresAt.toISOString()} />
          </div>
        ) : null}

        <div className="mt-7 grid gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-5 text-left sm:grid-cols-2">
          {order.tradingAccount ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Upgrade Trading Account</p>
              <p className="mt-1 font-semibold text-emerald-300">
                {order.tradingAccount.accountId}
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-xs text-slate-500">Order</p>
            <p className="mt-1 font-semibold text-white">
              {order.expertAdvisor.name} — {order.package.name}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total</p>
            <p className="mt-1 font-semibold text-white">{amount}</p>
          </div>
        </div>

        {order.status === "PENDING" &&
        isQris &&
        (order.paymentNumber || qrCodeDataUrl) ? (
          <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-400/[0.04] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Instruksi Pembayaran
            </p>

            {isQris ? (
              <div className="mt-4">
                {qrCodeDataUrl ? (
                  <div>
                    <div className="mx-auto w-fit rounded-2xl bg-white p-3">
                      <Image
                        src={qrCodeDataUrl}
                        alt="QRIS pembayaran CuanHero"
                        width={280}
                        height={280}
                        unoptimized
                        className="h-auto w-[240px] sm:w-[280px]"
                      />
                    </div>
                    <a
                      href={qrCodeDataUrl}
                      download={`qris-${order.orderNumber}.${qrisFileExtension}`}
                      className="mx-auto mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-300/35 px-4 text-xs font-bold text-cyan-200 transition hover:bg-cyan-400/10"
                    >
                      <Download className="h-4 w-4" />
                      Download QRIS
                    </a>
                  </div>
                ) : (
                  <p className="break-all rounded-lg bg-slate-950 p-3 font-mono text-xs text-white">
                    QRIS belum tersedia. Silakan hubungi admin CuanHero.
                  </p>
                )}
                <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300">
                  Scan QRIS menggunakan aplikasi mobile banking atau e-wallet,
                  lalu selesaikan pembayaran sebesar <strong>{amount}</strong>.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-xs text-slate-500">
                  {order.paymentName || order.paymentChannel?.toUpperCase() ||
                    "Virtual Account"}
                </p>
                <p className="mt-2 break-all font-mono text-2xl font-black tracking-wide text-white">
                  {order.paymentNumber}
                </p>
                <div className="mt-4">
                  <CopyPaymentNumber value={order.paymentNumber || ""} />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  Transfer tepat sebesar <strong>{amount}</strong> ke nomor virtual
                  account di atas.
                </p>
              </div>
            )}

            {expiresAt ? (
              <p className="mt-4 text-xs text-amber-300">
                Selesaikan pembayaran sebelum {expiresAt} WIB.
              </p>
            ) : null}

            {isStaticQris && confirmationHref ? (
              <a
                href={confirmationHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-white transition hover:bg-emerald-400"
              >
                <MessageCircle className="h-5 w-5" />
                Konfirmasi Pembayaran via WhatsApp
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <OrderPaymentStatus status={order.status} />
          <Link
            href="/member/home"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Member Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
