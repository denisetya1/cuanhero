import { auth } from "@/lib/auth";
import { getLocalizedText } from "@/lib/localized-text";
import { sanitizeMemberRedirect } from "@/lib/member-redirect";
import prisma from "@/lib/prisma";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import RegisterForm from "../../components/RegisterForm";

const formatPrice = (value: string) => {
  const price = Number(value);
  if (!Number.isFinite(price)) return value;

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
};

export default async function MemberRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const params = await searchParams;
  const redirectTo = sanitizeMemberRedirect(
    Array.isArray(params.ref) ? params.ref[0] : params.ref,
  );
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) redirect(redirectTo);

  const redirectUrl = new URL(redirectTo, "https://cuanhero.local");
  const eaId = Number(redirectUrl.searchParams.get("ea"));
  const packageId = Number(redirectUrl.searchParams.get("package"));
  const hasOrderSelection =
    redirectUrl.pathname === "/member/order/checkout" &&
    Number.isInteger(eaId) &&
    Number.isInteger(packageId);
  const [expertAdvisor, packageItem] = hasOrderSelection
    ? await Promise.all([
        prisma.expertAdvisor.findFirst({
          where: { id: eaId, isActive: true },
          select: { id: true, name: true, description: true, codeName: true },
        }),
        prisma.package.findUnique({
          where: { id: packageId },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discountPercent: true,
            recurringType: true,
          },
        }),
      ])
    : [null, null];
  const price = Number(packageItem?.price || 0);
  const discount = packageItem?.discountPercent || 0;
  const total =
    packageItem && Number.isFinite(price) && discount > 0
      ? String(price - (price * discount) / 100)
      : packageItem?.price || "0";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,217,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,217,255,0.035)_1px,transparent_1px)] bg-size-[44px_44px]" />
      <div className="pointer-events-none absolute left-[8%] top-16 h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-[8%] h-80 w-80 rounded-full bg-fuchsia-500/8 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" aria-label="CuanHero home">
            <Image
              src="/images/logo.png"
              alt="CuanHero"
              width={230}
              height={80}
              priority
              className="h-auto w-44 md:w-52"
            />
          </Link>
          {expertAdvisor && packageItem ? (
            <Link
              href={`/order?ea=${expertAdvisor.id}&package=${packageItem.id}`}
              className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Ubah pilihan</span>
            </Link>
          ) : null}
        </div>

        <div
          className={`grid gap-6 ${
            expertAdvisor && packageItem
              ? "lg:grid-cols-[minmax(0,1fr)_340px]"
              : "mx-auto max-w-xl"
          }`}
        >
          <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
            <RegisterForm redirectTo={redirectTo} />
            <div className="mt-6 border-t border-cyan-400/15 pt-5 text-center">
              <p className="mb-3 text-xs text-slate-500">
                Already have a CuanHero account?
              </p>
              <Link
                href={`/member/login?ref=${encodeURIComponent(redirectTo)}`}
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-cyan-300/40 bg-cyan-400/5 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/10"
              >
                Login
              </Link>
            </div>
          </section>

          {expertAdvisor && packageItem ? (
            <aside className="h-fit rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.25)] backdrop-blur lg:sticky lg:top-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Ringkasan Order
              </p>
              <div className="mt-5 space-y-5 border-y border-white/10 py-5">
                <div>
                  <p className="text-xs text-slate-500">Expert Advisor</p>
                  <p className="mt-1 font-semibold text-white">
                    {expertAdvisor.name}
                  </p>
                  {expertAdvisor.codeName ? (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                      {expertAdvisor.codeName}
                    </p>
                  ) : null}
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
                    {getLocalizedText(expertAdvisor.description, "id")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Package</p>
                  <p className="mt-1 font-semibold text-white">
                    {packageItem.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {packageItem.recurringType}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <span className="text-sm text-slate-400">Total</span>
                <span className="text-xl font-black text-white">
                  {formatPrice(total)}
                </span>
              </div>
              <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                Detail pilihan Anda akan tetap tersimpan setelah registrasi.
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </main>
  );
}
