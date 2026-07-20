import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

type IpaymuEnvironment = "sandbox" | "production";

export type IpaymuDirectPaymentPayload = {
  account: string;
  name: string;
  phone: string;
  email: string;
  amount: number;
  product: string[];
  qty: string[];
  price: string[];
  notifyUrl: string;
  referenceId: string;
  paymentMethod: "qris" | "va";
  paymentChannel?: string;
  feeDirection: "MERCHANT" | "BUYER";
  expired: number;
  expiredType: "hours";
};

type IpaymuDirectData = {
  [key: string]: unknown;
};

type IpaymuDirectResponse = {
  Status?: number;
  Success?: boolean;
  Message?: string;
  Data?: IpaymuDirectData | IpaymuDirectData[] | null;
};

const getConfig = () => {
  const va = process.env.IPAYMU_VA?.trim();
  const apiKey = process.env.IPAYMU_API_KEY?.trim();
  const environment = (process.env.IPAYMU_ENV?.trim().toLowerCase() ||
    "sandbox") as IpaymuEnvironment;

  if (!va || !apiKey) {
    throw new Error("IPAYMU_VA dan IPAYMU_API_KEY belum dikonfigurasi.");
  }

  if (!(["sandbox", "production"] as const).includes(environment)) {
    throw new Error("IPAYMU_ENV harus bernilai sandbox atau production.");
  }

  return {
    va,
    apiKey,
    baseUrl:
      environment === "production"
        ? "https://my.ipaymu.com"
        : "https://sandbox.ipaymu.com",
  };
};

const formatTimestamp = (date = new Date()) =>
  date.toISOString().replace(/[-:T]/g, "").slice(0, 14);

export const createIpaymuRequestSignature = (
  method: string,
  rawBody: string,
  va: string,
  apiKey: string,
) => {
  const bodyHash = createHash("sha256")
    .update(rawBody)
    .digest("hex")
    .toLowerCase();
  const stringToSign = `${method.toUpperCase()}:${va}:${bodyHash}:${apiKey}`;

  return createHmac("sha256", apiKey).update(stringToSign).digest("hex");
};

const readDirectField = (
  data: IpaymuDirectData,
  ...keys: string[]
) => {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

export const createIpaymuDirectPayment = async (
  payload: Omit<IpaymuDirectPaymentPayload, "account">,
) => {
  const { va, apiKey, baseUrl } = getConfig();
  const requestPayload: IpaymuDirectPaymentPayload = {
    account: va,
    ...payload,
  };
  const rawBody = JSON.stringify(requestPayload);
  const signature = createIpaymuRequestSignature(
    "POST",
    rawBody,
    va,
    apiKey,
  );

  const response = await fetch(`${baseUrl}/api/v2/payment/direct`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      signature,
      timestamp: formatTimestamp(),
      va,
    },
    body: rawBody,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const rawResponse = await response.text();
  let body: IpaymuDirectResponse;

  try {
    body = JSON.parse(rawResponse) as IpaymuDirectResponse;
  } catch {
    throw new Error(
      `iPaymu memberikan response non-JSON (HTTP ${response.status}).`,
    );
  }

  const data = Array.isArray(body.Data) ? body.Data[0] : body.Data;

  if (!response.ok || body.Success === false || !data) {
    throw new Error(
      body.Message || `Gagal membuat pembayaran iPaymu (HTTP ${response.status}).`,
    );
  }

  const sessionId = readDirectField(data, "SessionID", "SessionId", "sessionId");
  const paymentNumber = readDirectField(
    data,
    "PaymentNo",
    "paymentNo",
    "QrString",
    "QRString",
    "qrString",
  );

  if (!sessionId || !paymentNumber) {
    throw new Error("Detail pembayaran tidak ditemukan pada response iPaymu.");
  }

  return {
    sessionId: String(sessionId),
    transactionId: String(
      readDirectField(data, "TransactionId", "TransactionID", "transactionId") ||
        "",
    ),
    paymentNumber: String(paymentNumber),
    paymentName: String(
      readDirectField(data, "PaymentName", "paymentName") || "",
    ),
    via: String(readDirectField(data, "Via", "via") || payload.paymentMethod),
    channel: String(
      readDirectField(data, "Channel", "channel") ||
        payload.paymentChannel ||
        payload.paymentMethod,
    ),
    fee: Number(readDirectField(data, "Fee", "fee") || 0),
    total: Number(readDirectField(data, "Total", "total") || payload.amount),
    expired: String(readDirectField(data, "Expired", "expired") || ""),
    message: body.Message || "Success",
  };
};

const integerCallbackFields = new Set([
  "trx_id",
  "status_code",
  "transaction_status_code",
  "paid_off",
]);

const normalizeCallbackValue = (key: string, value: unknown): unknown => {
  if (integerCallbackFields.has(key)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : value;
  }

  if (key === "is_escrow") {
    return value === true || value === 1 || value === "1" || value === "true";
  }

  if (key === "additional_info") {
    if (value === undefined || value === null || value === "") return [];
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return value;
      }
    }
  }

  return value;
};

const sortObject = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      const normalized = normalizeCallbackValue(
        key,
        (value as Record<string, unknown>)[key],
      );
      result[key] = sortObject(normalized);
      return result;
    }, Object.create(null) as Record<string, unknown>);
};

const safeEqualHex = (received: string, expected: string) => {
  if (!/^[a-f\d]+$/i.test(received) || received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(received.toLowerCase(), "utf8"),
    Buffer.from(expected.toLowerCase(), "utf8"),
  );
};

export const verifyIpaymuCallbackSignature = (
  payload: Record<string, unknown>,
  receivedSignature: string | null,
) => {
  if (!receivedSignature) return false;

  const va = process.env.IPAYMU_VA?.trim();
  if (!va) return false;

  const normalizedPayload = sortObject({
    ...payload,
    additional_info: payload.additional_info ?? [],
  });
  const serialized = JSON.stringify(normalizedPayload).replace(/\//g, "\\/");
  const expected = createHmac("sha256", va)
    .update(serialized)
    .digest("hex");

  return safeEqualHex(receivedSignature.trim(), expected);
};
