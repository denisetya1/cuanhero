import CmsPageView from "../../components/CmsPageView";
import { getPublishedCmsPage } from "@/lib/public-cms-page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type CmsPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedCmsPage(slug);
  if (!page) return {};

  return {
    title: page.metaTitleEn || page.titleEn,
    description: page.metaDescriptionEn || undefined,
    alternates: {
      canonical: `/en/${page.slug}`,
      languages: {
        id: `/${page.slug}`,
        en: `/en/${page.slug}`,
      },
    },
  };
}

export default async function CmsPage({ params }: CmsPageProps) {
  const { slug } = await params;
  const page = await getPublishedCmsPage(slug);
  if (!page) notFound();

  return <CmsPageView title={page.titleEn} content={page.contentEn} label="CuanHero / Page" />;
}

