import type { Metadata } from "next";
import { Suspense } from "react";
import OrderPage from "../../components/OrderPage";

export const metadata: Metadata = {
  title: "Order an Expert Advisor | CuanHero",
  description: "Choose your CuanHero Expert Advisor and license plan.",
};

export default function EnglishOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 text-slate-400">
          Loading order page...
        </div>
      }
    >
      <OrderPage lang="en" />
    </Suspense>
  );
}
