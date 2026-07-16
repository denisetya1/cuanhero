type JsonRecord = Record<string, unknown>;

const ACCOUNT_ID_FIELDS = new Set([
  "account",
  "account_id",
  "accountid",
  "client_account",
  "clientaccount",
  "trading_account",
  "tradingaccount",
  "mt_account",
  "mtaccount",
  "login",
]);

const PARTNER_CODE_FIELDS = new Set([
  "partner_code",
  "partnercode",
  "affiliate_code",
  "affiliatecode",
]);

const asRecord = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const findStringByKeys = (value: unknown, keys: Set<string>): string | null => {
  const record = asRecord(value);
  if (!record) return null;

  for (const [key, item] of Object.entries(record)) {
    if (
      keys.has(key.toLowerCase()) &&
      ["string", "number"].includes(typeof item)
    ) {
      return String(item);
    }
  }

  return null;
};

const findAccountRecord = (
  value: unknown,
  accountId: string,
): JsonRecord | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findAccountRecord(item, accountId);
      if (match) return match;
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) return null;

  if (findStringByKeys(record, ACCOUNT_ID_FIELDS) === accountId) {
    return record;
  }

  for (const item of Object.values(record)) {
    const match = findAccountRecord(item, accountId);
    if (match) return match;
  }

  return null;
};

const readJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const describeApiError = (value: unknown) => {
  if (!value) return "No response body.";
  if (typeof value === "string") return value.slice(0, 500);

  const record = asRecord(value);
  if (record) {
    const directMessage = [record.detail, record.message, record.error].find(
      (item): item is string => typeof item === "string" && Boolean(item),
    );
    if (directMessage) return directMessage.slice(0, 500);
  }

  try {
    return JSON.stringify(value).slice(0, 500);
  } catch {
    return "Unrecognized response body.";
  }
};

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
};

const resolveAccountsUrl = (accountId: string, apiBaseUrl: string) => {
  const configuredUrl =
    process.env.EXNESS_CLIENT_ACCOUNTS_URL?.trim() ||
    `${apiBaseUrl}/api/reports/clients/accounts/`;
  const replacedUrl = configuredUrl.replaceAll(
    "{accountId}",
    encodeURIComponent(accountId),
  );

  if (replacedUrl !== configuredUrl) return replacedUrl;

  const url = new URL(replacedUrl);
  url.searchParams.set(
    process.env.EXNESS_ACCOUNT_QUERY_PARAM?.trim() || "client_account",
    accountId,
  );
  console.log("UUDD:", url.toString());
  return url.toString();
};

export const verifyExnessPartnerAccount = async (accountId: string) => {
  const apiBaseUrl = (
    process.env.EXNESS_PARTNER_API_BASE_URL || "https://my.exnessaffiliates.com"
  ).replace(/\/$/, "");
  const email = getRequiredEnv("EXNESS_PARTNER_EMAIL");
  const password = getRequiredEnv("EXNESS_PARTNER_PASSWORD");
  const authUrl =
    process.env.EXNESS_AUTH_URL?.trim() || `${apiBaseUrl}/api/v2/auth/`;
  const configuredLoginField = process.env.EXNESS_AUTH_LOGIN_FIELD?.trim();
  const loginField =
    configuredLoginField || (authUrl.includes("/v2/") ? "login" : "email");

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(loginField)) {
    throw new Error("EXNESS_AUTH_LOGIN_FIELD contains an invalid field name.");
  }

  const authResponse = await fetch(authUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ [loginField]: email, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    // A redirect can turn POST into GET and surface as a misleading HTTP 405.
    redirect: "manual",
  });
  const authBody = await readJson(authResponse);
  const authRecord = asRecord(authBody);
  const token =
    authRecord &&
    [authRecord.token, authRecord.access, authRecord.access_token].find(
      (value): value is string => typeof value === "string" && Boolean(value),
    );

  if (authResponse.status >= 300 && authResponse.status < 400) {
    throw new Error(
      `Exness auth URL redirected to ${authResponse.headers.get("location") || "another URL"}. Configure EXNESS_AUTH_URL with the final endpoint.`,
    );
  }

  if (!authResponse.ok || !token) {
    throw new Error(
      `Exness authentication failed (HTTP ${authResponse.status}, login field: ${loginField}): ${describeApiError(authBody)}`,
    );
  }

  const accountsResponse = await fetch(
    resolveAccountsUrl(accountId, apiBaseUrl),
    {
      headers: {
        Accept: "application/json",
        Authorization: `JWT ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const accountsBody = await readJson(accountsResponse);

  if (!accountsResponse.ok) {
    throw new Error(
      `Exness Client Accounts request failed (HTTP ${accountsResponse.status}): ${describeApiError(accountsBody)}`,
    );
  }

  const account = findAccountRecord(accountsBody, accountId);
  if (!account) {
    return { verified: false as const, partnerCode: null };
  }

  const partnerCode = findStringByKeys(account, PARTNER_CODE_FIELDS);
  const expectedPartnerCode = process.env.EXNESS_PARTNER_CODE?.trim();

  if (expectedPartnerCode && partnerCode !== expectedPartnerCode) {
    return { verified: false as const, partnerCode };
  }

  return { verified: true as const, partnerCode };
};
