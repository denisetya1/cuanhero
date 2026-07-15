// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
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

  const settings = await prisma.appSetting.findUnique({
    where: { id: 1 },
    select: {
      whatsappNumber: true,
      renewalMessageEn: true,
      renewalMessageId: true,
    },
  });

  return (
    <div className="p-0">
      <MemberHomeDashboard
        whatsappNumber={settings?.whatsappNumber || ""}
        renewalMessageEn={settings?.renewalMessageEn || ""}
        renewalMessageId={settings?.renewalMessageId || ""}
      />
    </div>
  );
}
