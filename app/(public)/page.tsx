import type { Metadata } from "next";
import { getPublicMetadata } from "@/lib/public-metadata";
import LandingPage from "./components/LandingPage";

// Settings landing page (WhatsApp, TikTok Live, dan metadata) dikelola admin,
// jadi halaman harus membaca database pada request terbaru, bukan saat build.
export const dynamic = "force-dynamic";

export const generateMetadata = (): Promise<Metadata> =>
  getPublicMetadata("id");

export default function Home() {
  return <LandingPage lang="id" />;
}
