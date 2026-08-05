import { auth } from "@/lib/auth";
import { decryptText, encryptText } from "@/lib/encryption";
import {
  IB_VERIFICATION_PACKAGE_CODES,
  verifyIbVerificationToken,
} from "@/lib/ib-verification";
import prisma from "@/lib/prisma";
import {
  getPySyncBaseUrl,
  getPySyncServerAddress,
  PYSYNC_API_KEY,
} from "@/lib/pysync";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const ensureAdmin = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      role: true,
    },
  });

  if (!user?.role || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  return { ...session, adminRole: user.role };
};

const safelyDecryptText = (value?: string | null) => {
  if (!value) return "";

  try {
    return decryptText(value);
  } catch {
    return "";
  }
};

const readPySyncResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { detail: text };
  }
};

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      tradingAccounts: {
        where: {
          status: {
            not: 4,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          accountId: true,
          accountPassword: true,
          packageId: true,
          expertAdvisorId: true,
          accountName: true,
          accountServer: true,
          accountType: true,
          accountBalance: true,
          recurringPrice: true,
          currency: true,
          status: true,
          eaStatus: true,
          eaConfiguration: true,
          createdAt: true,
          endDate: true,
          serverId: true,
          package: {
            select: {
              name: true,
            },
          },
          expertAdvisor: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return buildErrorResponse("USER_NOT_FOUND", "User not found.", [], 404);
  }

  const serverIds = user.tradingAccounts
    .map((account) => account.serverId)
    .filter((serverId): serverId is number => Boolean(serverId));
  const servers = await prisma.server.findMany({
    where: {
      id: {
        in: serverIds,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });
  const serverMap = new Map(servers.map((server) => [server.id, server]));

  return buildResponse({
    ...user,
    tradingAccounts: user.tradingAccounts.map((account) => ({
      ...account,
      tradingPassword: safelyDecryptText(account.accountPassword),
      accountPassword: undefined,
      server: account.serverId ? serverMap.get(account.serverId) || null : null,
    })),
  });
};

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  const { userId } = await params;
  const body = await req.json();
  const accountId = String(body.accountId || "").trim();
  const password = String(body.password || "");
  const server = String(body.server || "").trim();
  const accountType = String(body.accountType || "CENT")
    .trim()
    .toUpperCase();
  const serverId = Number(body.serverId);
  const packageId = Number(body.packageId);
  const expertAdvisorId = Number(body.expertAdvisorId);
  const recurringPrice = String(body.recurringPrice || "").trim();
  const currency = String(body.currency || "")
    .trim()
    .toUpperCase();
  const status = Number(body.status);
  const endDate = body.endDate ? String(body.endDate).trim() : "";
  const ibVerificationToken = String(body.ibVerificationToken || "");
  const allowedCurrencies = ["IDR", "USD", "MYR", "SGD"];
  const allowedAccountTypes = ["STANDARD", "CENT"];
  const recurringPriceNumber = Number(recurringPrice);

  if (
    !accountId ||
    !password ||
    !server ||
    !serverId ||
    !packageId ||
    !expertAdvisorId ||
    !recurringPrice ||
    !currency
  ) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Account ID, password, server, package, Expert Advisor, recurring price, and currency are required.",
      [],
    );
  }

  if (!allowedCurrencies.includes(currency)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Currency must be IDR, USD, MYR, or SGD.",
      [],
    );
  }

  if (!allowedAccountTypes.includes(accountType)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Account type must be Standard or Cent.",
      [],
    );
  }

  if (![0, 1, 2].includes(status)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Status must be inactive, active, or suspended.",
      [],
    );
  }

  if (endDate && Number.isNaN(Date.parse(`${endDate}T00:00:00.000Z`))) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Subscription end date must be a valid date.",
      [],
    );
  }

  if (!Number.isFinite(recurringPriceNumber) || recurringPriceNumber < 0) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Recurring price must be a valid number.",
      [],
    );
  }

  const [
    targetUser,
    existingAccount,
    selectedServer,
    selectedPackage,
    selectedExpertAdvisor,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    }),
    prisma.tradingAccount.findUnique({
      where: {
        accountId,
      },
      select: {
        id: true,
      },
    }),
    prisma.server.findUnique({
      where: {
        id: serverId,
      },
      select: {
        name: true,
        status: true,
        maxAccounts: true,
        _count: {
          select: {
            tradingAccounts: {
              where: {
                status: {
                  not: 4,
                },
              },
            },
          },
        },
      },
    }),
    prisma.package.findUnique({
      where: {
        id: packageId,
      },
      select: {
        id: true,
        code: true,
      },
    }),
    prisma.expertAdvisor.findUnique({
      where: {
        id: expertAdvisorId,
      },
      select: {
        id: true,
        defaultConfig: true,
      },
    }),
  ]);

  if (!targetUser) {
    return buildErrorResponse("USER_NOT_FOUND", "User not found.", [], 404);
  }

  if (existingAccount) {
    return buildErrorResponse(
      "ACCOUNT_EXISTS",
      "Account ID is already in use.",
      [],
      409,
    );
  }

  if (!selectedServer || !selectedPackage || !selectedExpertAdvisor) {
    return buildErrorResponse(
      "INVALID_RELATION",
      "Selected server, package, or Expert Advisor is invalid.",
      [],
    );
  }

  if (
    selectedServer.status !== 1 ||
    selectedServer._count.tradingAccounts >= selectedServer.maxAccounts
  ) {
    return buildErrorResponse(
      "SERVER_CAPACITY_REACHED",
      "Selected VPS server is inactive or has reached its account capacity.",
      [],
      409,
    );
  }

  const selectedPackageCode = selectedPackage.code?.trim().toUpperCase();

  if (
    selectedPackageCode &&
    IB_VERIFICATION_PACKAGE_CODES.has(selectedPackageCode) &&
    !verifyIbVerificationToken(ibVerificationToken, {
      accountId,
      packageId: selectedPackage.id,
      packageCode: selectedPackageCode,
    })
  ) {
    return buildErrorResponse(
      "IB_VERIFICATION_REQUIRED",
      "Verify this Exness account under the configured IB before creating it.",
      [],
      403,
    );
  }

  try {
    const now = new Date();
    const tradingAccount = await prisma.$transaction(async (tx) => {
      const createdTradingAccount = await tx.tradingAccount.create({
        data: {
          accountId,
          accountPassword: encryptText(password),
          accountServer: server,
          accountType,
          userId,
          serverId,
          packageId: selectedPackage.id,
          expertAdvisorId: selectedExpertAdvisor.id,
          ...(selectedExpertAdvisor.defaultConfig !== null && {
            eaConfiguration: selectedExpertAdvisor.defaultConfig,
          }),
          recurringPrice,
          currency,
          status,
          eaStatus: 0,
          endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : null,
          createdBy: session.user.id,
        },
        select: {
          id: true,
          accountId: true,
          accountServer: true,
          accountType: true,
          serverId: true,
          recurringPrice: true,
          currency: true,
          package: {
            select: {
              name: true,
            },
          },
          expertAdvisor: {
            select: {
              name: true,
            },
          },
          status: true,
          createdAt: true,
          endDate: true,
        },
      });

      await tx.paymentRecord.create({
        data: {
          tradingAccountId: createdTradingAccount.id,
          packageId: selectedPackage.id,
          amount: recurringPrice,
          currency,
          paymentMethod: "QRIS_STATIC",
          type: "ACTIVATION",
          status: "APPROVED",
          paidAt: now,
          approvedAt: now,
          note: "Initial activation created from admin trading account setup.",
          createdBy: session.user.id,
        },
      });

      return createdTradingAccount;
    });

    return buildResponse(tradingAccount);
  } catch (error) {
    console.error("CREATE_ADMIN_TRADING_ACCOUNT_ERROR:", error);
    return buildErrorResponse(
      "CREATE_TRADING_ACCOUNT_FAILED",
      "Failed to create trading account.",
      [],
      500,
    );
  }
};

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  const { userId } = await params;
  const body = await req.json();

  if (body.action === "update-config") {
    const tradingAccountId = Number(body.accountId);
    const configuration = body.configuration;

    if (
      !tradingAccountId ||
      !configuration ||
      typeof configuration !== "object" ||
      Array.isArray(configuration)
    ) {
      return buildErrorResponse(
        "INVALID_EA_CONFIGURATION",
        "EA configuration must be a valid JSON object.",
        [],
      );
    }

    const account = await prisma.tradingAccount.findFirst({
      where: { id: tradingAccountId, userId },
      select: {
        id: true,
        accountId: true,
        server: { select: { ipAddress: true, domain: true } },
      },
    });

    if (!account) {
      return buildErrorResponse(
        "TRADING_ACCOUNT_NOT_FOUND",
        "Trading account not found.",
        [],
        404,
      );
    }

    if (!account.server.ipAddress) {
      return buildErrorResponse(
        "PYSYNC_SERVER_NOT_CONFIGURED",
        "The pySync address has not been configured on the VPS server.",
        [],
      );
    }

    try {
      const pySyncResponse = await fetch(
        `${getPySyncBaseUrl(getPySyncServerAddress(account.server))}/api/config/update-config`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PYSYNC_API_KEY}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId: account.accountId,
            eaConfig: configuration,
          }),
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        },
      );
      const pySyncData = await readPySyncResponse(pySyncResponse);

      if (!pySyncResponse.ok) {
        const detail = pySyncData?.detail;
        return buildErrorResponse(
          "PYSYNC_CONFIG_UPDATE_FAILED",
          typeof detail === "string"
            ? detail
            : `pySync responded with status ${pySyncResponse.status}.`,
          [],
          502,
        );
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      return buildErrorResponse(
        "PYSYNC_UNREACHABLE",
        isTimeout
          ? "The pySync connection timed out while updating the configuration."
          : "Unable to send the configuration to the pySync server.",
        [],
        502,
      );
    }

    const syncedAt = new Date();
    const updatedAccount = await prisma.tradingAccount.update({
      where: { id: account.id },
      data: {
        eaConfiguration: configuration,
        lastSync: syncedAt,
        updatedBy: session.user.id,
      },
      select: {
        id: true,
        accountId: true,
        eaConfiguration: true,
        lastSync: true,
      },
    });

    return buildResponse(updatedAccount);
  }

  const accountId = Number(body.accountId);
  const loginId = String(body.loginId || "").trim();
  const password = String(body.password || "");
  const server = String(body.server || "").trim();
  const accountType = String(body.accountType || "CENT")
    .trim()
    .toUpperCase();
  const serverId = Number(body.serverId);
  const packageId = Number(body.packageId);
  const expertAdvisorId = Number(body.expertAdvisorId);
  const recurringPrice = String(body.recurringPrice || "").trim();
  const currency = String(body.currency || "")
    .trim()
    .toUpperCase();
  const status = Number(body.status);
  const endDate = body.endDate ? String(body.endDate).trim() : "";
  const allowedCurrencies = ["IDR", "USD", "MYR", "SGD"];
  const allowedAccountTypes = ["STANDARD", "CENT"];

  if (
    !accountId ||
    !loginId ||
    !server ||
    !serverId ||
    !packageId ||
    !expertAdvisorId ||
    !recurringPrice ||
    !currency ||
    ![0, 1, 2].includes(status)
  ) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Account ID, server, package, Expert Advisor, recurring price, currency, and a valid status are required.",
      [],
    );
  }

  if (!allowedCurrencies.includes(currency)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Currency must be IDR, USD, MYR, or SGD.",
      [],
    );
  }


  if (!allowedAccountTypes.includes(accountType)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Account type must be Standard or Cent.",
      [],
    );
  }

  if (endDate && Number.isNaN(Date.parse(`${endDate}T00:00:00.000Z`))) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Subscription end date must be a valid date.",
      [],
    );
  }

  const [
    existingAccount,
    duplicateAccount,
    selectedServer,
    selectedPackage,
    selectedExpertAdvisor,
  ] = await Promise.all([
    prisma.tradingAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: {
        id: true,
        serverId: true,
      },
    }),
    prisma.tradingAccount.findUnique({
      where: {
        accountId: loginId,
      },
      select: {
        id: true,
      },
    }),
    prisma.server.findUnique({
      where: {
        id: serverId,
      },
      select: {
        id: true,
        status: true,
        maxAccounts: true,
        _count: {
          select: {
            tradingAccounts: {
              where: {
                status: {
                  not: 4,
                },
              },
            },
          },
        },
      },
    }),
    prisma.package.findUnique({
      where: {
        id: packageId,
      },
      select: {
        id: true,
      },
    }),
    prisma.expertAdvisor.findUnique({
      where: {
        id: expertAdvisorId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!existingAccount) {
    return buildErrorResponse(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading account not found.",
      [],
      404,
    );
  }

  if (duplicateAccount && duplicateAccount.id !== accountId) {
    return buildErrorResponse(
      "ACCOUNT_EXISTS",
      "Account ID is already in use.",
      [],
      409,
    );
  }

  if (!selectedServer || !selectedPackage || !selectedExpertAdvisor) {
    return buildErrorResponse(
      "INVALID_RELATION",
      "Selected server, package, or Expert Advisor is invalid.",
      [],
    );
  }

  if (
    existingAccount.serverId !== serverId &&
    (selectedServer.status !== 1 ||
      selectedServer._count.tradingAccounts >= selectedServer.maxAccounts)
  ) {
    return buildErrorResponse(
      "SERVER_CAPACITY_REACHED",
      "Selected VPS server is inactive or has reached its account capacity.",
      [],
      409,
    );
  }

  const tradingAccount = await prisma.tradingAccount.update({
    where: {
      id: accountId,
    },
    data: {
      accountId: loginId,
      ...(password && {
        accountPassword: encryptText(password),
      }),
      accountServer: server,
      accountType,
      serverId,
      packageId,
      expertAdvisorId,
      recurringPrice,
      currency,
      status,
      endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : null,
    },
    select: {
      id: true,
      accountId: true,
      accountType: true,
      status: true,
      endDate: true,
    },
  });

  return buildResponse(tradingAccount);
};

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  const { userId } = await params;
  const body = await req.json();
  const tradingAccountId = Number(body.accountId);

  if (!tradingAccountId) {
    return buildErrorResponse(
      "INVALID_REQUEST",
      "Trading account ID is required.",
      [],
    );
  }

  const account = await prisma.tradingAccount.findFirst({
    where: {
      id: tradingAccountId,
      userId,
      status: {
        not: 4,
      },
    },
    select: {
      id: true,
      accountId: true,
      eaStatus: true,
      server: {
        select: {
          ipAddress: true,
          domain: true,
        },
      },
    },
  });

  if (!account) {
    return buildErrorResponse(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading account not found.",
      [],
      404,
    );
  }

  const hasDeployedRuntime = [1, 2, 3].includes(account.eaStatus);

  if (hasDeployedRuntime) {
    if (!account.server.ipAddress) {
      return buildErrorResponse(
        "PYSYNC_SERVER_NOT_CONFIGURED",
        "Alamat pySync pada VPS server belum dikonfigurasi.",
        [],
      );
    }

    const clientId = encodeURIComponent(account.accountId);
    const terminateUrl = `${getPySyncBaseUrl(
      getPySyncServerAddress(account.server),
    )}/api/deploy/${clientId}/terminate`;

    try {
      const terminateResponse = await fetch(terminateUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${PYSYNC_API_KEY}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });

      if (!terminateResponse.ok) {
        const responseText = await terminateResponse.text();
        let detail = responseText;

        try {
          const responseData = JSON.parse(responseText) as {
            detail?: unknown;
          };
          if (typeof responseData.detail === "string") {
            detail = responseData.detail;
          }
        } catch {
          // Gunakan response text jika pySync tidak mengembalikan JSON.
        }

        return buildErrorResponse(
          "PYSYNC_TERMINATE_FAILED",
          detail || `pySync merespons dengan status ${terminateResponse.status}.`,
          [],
          502,
        );
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      return buildErrorResponse(
        "PYSYNC_UNREACHABLE",
        isTimeout
          ? "Koneksi ke pySync timeout saat terminate service."
          : "Tidak dapat menghubungi pySync untuk terminate service.",
        [],
        502,
      );
    }
  }

  const deletedAccount = await prisma.tradingAccount.update({
    where: {
      id: account.id,
    },
    data: {
      status: 4,
      eaStatus: 4,
      updatedBy: session.user.id,
    },
    select: {
      id: true,
      accountId: true,
      status: true,
      eaStatus: true,
    },
  });

  return buildResponse({
    ...deletedAccount,
    runtimeTerminated: hasDeployedRuntime,
  });
};
