import { createHmac, timingSafeEqual } from "node:crypto";

export const IB_VERIFICATION_PACKAGE_CODES = new Set([
  "FREE_TRIAL",
  "IB_MONTHLY",
]);

type IbVerificationPayload = {
  accountId: string;
  packageId: number;
  packageCode: string;
  expiresAt: number;
};

const getVerificationSecret = () => {
  const secret =
    process.env.IB_VERIFICATION_SECRET || process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "IB_VERIFICATION_SECRET or BETTER_AUTH_SECRET must be configured.",
    );
  }

  return secret;
};

const sign = (encodedPayload: string) =>
  createHmac("sha256", getVerificationSecret())
    .update(encodedPayload)
    .digest("base64url");

export const createIbVerificationToken = ({
  accountId,
  packageId,
  packageCode,
}: Omit<IbVerificationPayload, "expiresAt">) => {
  const payload: IbVerificationPayload = {
    accountId,
    packageId,
    packageCode,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return {
    token: `${encodedPayload}.${sign(encodedPayload)}`,
    expiresAt: new Date(payload.expiresAt),
  };
};

export const verifyIbVerificationToken = (
  token: string,
  expected: Omit<IbVerificationPayload, "expiresAt">,
) => {
  try {
    const [encodedPayload, signature, ...extraParts] = token.split(".");
    if (!encodedPayload || !signature || extraParts.length > 0) return false;

    const expectedSignature = sign(encodedPayload);
    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as IbVerificationPayload;

    return (
      payload.accountId === expected.accountId &&
      payload.packageId === expected.packageId &&
      payload.packageCode === expected.packageCode &&
      Number.isFinite(payload.expiresAt) &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
};
