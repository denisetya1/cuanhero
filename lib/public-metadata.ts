import type { Metadata } from "next";
import prisma from "@/lib/prisma";

type PublicLanguage = "en" | "id";

const fallbackMetadata: Record<
  PublicLanguage,
  { title: string; description: string }
> = {
  en: {
    title: "CuanHero — Automated MT5 Expert Advisor & Trading Bot",
    description:
      "Automate your MT5 trading with CuanHero. Use flexible Expert Advisor settings, risk management, a news filter, and real-time bot monitoring.",
  },
  id: {
    title: "CuanHero — Expert Advisor & Trading Bot MT5 Otomatis",
    description:
      "Otomatiskan trading MT5 bersama CuanHero. Gunakan Expert Advisor dengan konfigurasi fleksibel, manajemen risiko, news filter, dan monitoring bot secara real-time.",
  },
};

export const getPublicMetadata = async (
  language: PublicLanguage,
): Promise<Metadata> => {
  const fallback = fallbackMetadata[language];

  try {
    const settings = await prisma.appSetting.findUnique({
      where: { id: 1 },
      select: {
        metaTitleEn: true,
        metaTitleId: true,
        metaDescriptionEn: true,
        metaDescriptionId: true,
      },
    });
    const title =
      (language === "en" ? settings?.metaTitleEn : settings?.metaTitleId) ||
      fallback.title;
    const description =
      (language === "en"
        ? settings?.metaDescriptionEn
        : settings?.metaDescriptionId) || fallback.description;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        locale: language === "en" ? "en_US" : "id_ID",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch (error) {
    console.error("LOAD_PUBLIC_METADATA_ERROR:", error);
    return fallback;
  }
};
