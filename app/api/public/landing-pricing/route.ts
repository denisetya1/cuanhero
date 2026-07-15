import prisma from "@/lib/prisma";
import { buildErrorResponse, buildResponse } from "@/lib/response";

export const GET = async () => {
  try {
    const [expertAdvisors, packages] = await Promise.all([
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
    ]);

    return buildResponse({
      expertAdvisors,
      packages,
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
