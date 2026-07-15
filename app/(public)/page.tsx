import type { Metadata } from "next";
import { getPublicMetadata } from "@/lib/public-metadata";
import LandingPage from "./components/LandingPage";

export const generateMetadata = (): Promise<Metadata> =>
  getPublicMetadata("id");

export default function Home() {
  return <LandingPage lang="id" />;
}
