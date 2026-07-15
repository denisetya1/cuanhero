import { getAdminSession } from "@/lib/admin-session";
import { parseCmsPageInput } from "@/lib/cms-page";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

const cmsPageSelect = {
  id: true,
  slug: true,
  titleEn: true,
  titleId: true,
  contentEn: true,
  contentId: true,
  metaTitleEn: true,
  metaTitleId: true,
  metaDescriptionEn: true,
  metaDescriptionId: true,
  isPublished: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
};

export const GET = async () => {
  const session = await getAdminSession();
  if (!session) return notAuthorizeResponse();

  const pages = await prisma.cmsPage.findMany({
    orderBy: { updatedAt: "desc" },
    select: cmsPageSelect,
  });

  return buildResponse(pages);
};

export const POST = async (req: NextRequest) => {
  const session = await getAdminSession();
  if (!session) return notAuthorizeResponse();

  const body = (await req.json()) as Record<string, unknown>;
  const { input, errors } = parseCmsPageInput(body);
  if (errors.length) {
    return buildErrorResponse("VALIDATION_ERROR", errors[0], errors);
  }

  const duplicate = await prisma.cmsPage.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (duplicate) {
    return buildErrorResponse(
      "CMS_PAGE_SLUG_EXISTS",
      "This page slug is already in use.",
      [],
      409,
    );
  }

  try {
    const page = await prisma.cmsPage.create({
      data: {
        ...input,
        publishedAt: input.isPublished ? new Date() : null,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
      select: cmsPageSelect,
    });

    revalidatePath(`/${page.slug}`);
    revalidatePath(`/en/${page.slug}`);
    return buildResponse(page);
  } catch (error) {
    console.error("CREATE_CMS_PAGE_ERROR:", error);
    return buildErrorResponse(
      "CREATE_CMS_PAGE_FAILED",
      "Failed to create CMS page.",
      [],
      500,
    );
  }
};

