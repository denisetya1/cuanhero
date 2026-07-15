import prisma from "@/lib/prisma";
import { buildErrorResponse, buildResponse } from "@/lib/response";

export const GET = async () => {
  try {
    const [expertAdvisors, packages, settings] = await Promise.all([
      prisma.expertAdvisor.findMany({
        where: {
          isActive: true,
        },
        orderBy: [{ orderNumber: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          codeName: true,
        },
      }),
      prisma.package.findMany({
        orderBy: [{ orderNumber: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          features: true,
          price: true,
          discountPercent: true,
          recurringType: true,
          orderNumber: true,
        },
      }),
      prisma.appSetting.findUnique({
        where: { id: 1 },
        select: {
          whatsappNumber: true,
          orderMessageEn: true,
          orderMessageId: true,
        },
      }),
    ]);

    return buildResponse({
      expertAdvisors,
      packages,
      settings: {
        whatsappNumber: settings?.whatsappNumber || "",
        orderMessageEn: settings?.orderMessageEn || "",
        orderMessageId: settings?.orderMessageId || "",
      },
    });
  } catch (error) {
    console.error("GET_PUBLIC_LANDING_PRICING_ERROR:", error);
    return buildErrorResponse(
      "GET_LANDING_PRICING_FAILED",
      "Failed to load landing pricing.",
      [],
      500,
    );
  }
};
