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

const getId = async (params: Promise<{ pageId: string }>) => {
  const { pageId } = await params;
  return Number(pageId);
};

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) => {
  const session = await getAdminSession();
  if (!session) return notAuthorizeResponse();

  const id = await getId(params);
  if (!Number.isInteger(id) || id <= 0) {
    return buildErrorResponse("VALIDATION_ERROR", "Invalid page ID.", []);
  }

  const page = await prisma.cmsPage.findUnique({
    where: { id },
    select: cmsPageSelect,
  });
  if (!page) {
    return buildErrorResponse("CMS_PAGE_NOT_FOUND", "Page not found.", [], 404);
  }

  return buildResponse(page);
};

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) => {
  const session = await getAdminSession();
  if (!session) return notAuthorizeResponse();

  const id = await getId(params);
  if (!Number.isInteger(id) || id <= 0) {
    return buildErrorResponse("VALIDATION_ERROR", "Invalid page ID.", []);
  }

  const existing = await prisma.cmsPage.findUnique({
    where: { id },
    select: { id: true, slug: true, isPublished: true, publishedAt: true },
  });
  if (!existing) {
    return buildErrorResponse("CMS_PAGE_NOT_FOUND", "Page not found.", [], 404);
  }

  const body = (await req.json()) as Record<string, unknown>;
  const { input, errors } = parseCmsPageInput(body);
  if (errors.length) {
    return buildErrorResponse("VALIDATION_ERROR", errors[0], errors);
  }

  const duplicate = await prisma.cmsPage.findFirst({
    where: { slug: input.slug, NOT: { id } },
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
    const page = await prisma.cmsPage.update({
      where: { id },
      data: {
        ...input,
        publishedAt: input.isPublished
          ? existing.publishedAt || new Date()
          : null,
        updatedBy: session.user.id,
      },
      select: cmsPageSelect,
    });

    for (const slug of new Set([existing.slug, page.slug])) {
      revalidatePath(`/${slug}`);
      revalidatePath(`/en/${slug}`);
    }
    return buildResponse(page);
  } catch (error) {
    console.error("UPDATE_CMS_PAGE_ERROR:", error);
    return buildErrorResponse(
      "UPDATE_CMS_PAGE_FAILED",
      "Failed to update CMS page.",
      [],
      500,
    );
  }
};

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) => {
  const session = await getAdminSession();
  if (!session) return notAuthorizeResponse();

  const id = await getId(params);
  if (!Number.isInteger(id) || id <= 0) {
    return buildErrorResponse("VALIDATION_ERROR", "Invalid page ID.", []);
  }

  const existing = await prisma.cmsPage.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!existing) {
    return buildErrorResponse("CMS_PAGE_NOT_FOUND", "Page not found.", [], 404);
  }

  try {
    await prisma.cmsPage.delete({ where: { id } });
    revalidatePath(`/${existing.slug}`);
    revalidatePath(`/en/${existing.slug}`);
    return buildResponse({ id });
  } catch (error) {
    console.error("DELETE_CMS_PAGE_ERROR:", error);
    return buildErrorResponse(
      "DELETE_CMS_PAGE_FAILED",
      "Failed to delete CMS page.",
      [],
      500,
    );
  }
};

