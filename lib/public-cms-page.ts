import "server-only";

import prisma from "@/lib/prisma";
import { cache } from "react";

export const getPublishedCmsPage = cache((slug: string) =>
  prisma.cmsPage.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    select: {
      slug: true,
      titleEn: true,
      titleId: true,
      contentEn: true,
      contentId: true,
      metaTitleEn: true,
      metaTitleId: true,
      metaDescriptionEn: true,
      metaDescriptionId: true,
      updatedAt: true,
    },
  }),
);

