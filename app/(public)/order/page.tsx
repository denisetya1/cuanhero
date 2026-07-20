import type { Metadata } from "next";
import { Suspense } from "react";
import OrderPage from "../components/OrderPage";

export const metadata: Metadata = {
  title: "Order Expert Advisor | CuanHero",
  description: "Pilih Expert Advisor dan paket lisensi CuanHero.",
};

export default function IndonesianOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 text-slate-400">
          Memuat halaman order...
        </div>
      }
    >
      <OrderPage lang="id" />
    </Suspense>
  );
}
