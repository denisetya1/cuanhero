// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MemberHomeDashboard from "./components/MemberHomeDashboard";

export default async function DashboardPage() {
  // Ambil sesi dengan mengirimkan headers halaman aktif
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Proteksi langsung di level komponen: jika tidak login, tendang ke homepage
  if (!session) {
    redirect("/");
  }

  return (
    <div className="p-0">
      <MemberHomeDashboard />
    </div>
  );
}
