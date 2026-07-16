import { auth } from "@/lib/auth";
import { verifyExnessPartnerAccount } from "@/lib/exness-partner";
import {
  createIbVerificationToken,
  IB_VERIFICATION_PACKAGE_CODES,
} from "@/lib/ib-verification";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const ensureAdmin = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user?.role && ["ADMIN", "SUPER_ADMIN"].includes(user.role)
    ? session
    : null;
};

export const POST = async (req: NextRequest) => {
  const session = await ensureAdmin();
  if (!session) return notAuthorizeResponse();

  const body = await req.json();
  const accountId = String(body.accountId || "").trim();
  const packageId = Number(body.packageId);

  if (!/^\d{4,20}$/.test(accountId) || !Number.isInteger(packageId)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Enter a valid Exness account ID and select a package.",
      [],
    );
  }

  const [selectedPackage, existingAccount] = await Promise.all([
    prisma.package.findUnique({
      where: { id: packageId },
      select: { id: true, code: true },
    }),
    prisma.tradingAccount.findUnique({
      where: { accountId },
      select: { id: true },
    }),
  ]);

  if (!selectedPackage?.code) {
    return buildErrorResponse("PACKAGE_NOT_FOUND", "Package not found.", [], 404);
  }

  const packageCode = selectedPackage.code.trim().toUpperCase();

  if (!IB_VERIFICATION_PACKAGE_CODES.has(packageCode)) {
    return buildErrorResponse(
      "IB_VERIFICATION_NOT_REQUIRED",
      "This package does not require IB verification.",
      [],
    );
  }

  if (existingAccount) {
    return buildErrorResponse(
      "ACCOUNT_EXISTS",
      "Account ID is already in use.",
      [],
      409,
    );
  }

  try {
    const result = await verifyExnessPartnerAccount(accountId);
    if (!result.verified) {
      return buildErrorResponse(
        "IB_ACCOUNT_NOT_VERIFIED",
        "This trading account is not registered under the configured Exness IB.",
        [],
        422,
      );
    }

    const verification = createIbVerificationToken({
      accountId,
      packageId: selectedPackage.id,
      packageCode,
    });

    return buildResponse({
      verified: true,
      verificationToken: verification.token,
      expiresAt: verification.expiresAt,
      partnerCode: result.partnerCode,
      accountType: result.accountType,
    });
  } catch (error) {
    console.error("VERIFY_EXNESS_IB_ERROR:", error);
    return buildErrorResponse(
      "IB_VERIFICATION_UNAVAILABLE",
      error instanceof Error ? error.message : "IB verification is unavailable.",
      [],
      502,
    );
  }
};
