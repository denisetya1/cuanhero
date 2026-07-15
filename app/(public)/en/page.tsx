import type { Metadata } from "next";
import { getPublicMetadata } from "@/lib/public-metadata";
import LandingPage from "../components/LandingPage";

export const generateMetadata = (): Promise<Metadata> =>
  getPublicMetadata("en");

export default function EnglishHome() {
  return <LandingPage lang="en" />;
}
