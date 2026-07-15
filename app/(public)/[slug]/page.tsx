import CmsPageView from "../components/CmsPageView";
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
    title: page.metaTitleId || page.titleId,
    description: page.metaDescriptionId || undefined,
    alternates: {
      canonical: `/${page.slug}`,
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

  return <CmsPageView title={page.titleId} content={page.contentId} label="CuanHero / Page" />;
}

