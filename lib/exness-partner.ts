type JsonRecord = Record<string, unknown>;

type ExnessTokenCache = {
  token: string | null;
  expiresAt: number;
  pending: Promise<string> | null;
};

const globalForExness = globalThis as typeof globalThis & {
  __exnessTokenCache?: ExnessTokenCache;
};

// Keep one token per Node.js process, including across Next.js module reloads.
const tokenCache = (globalForExness.__exnessTokenCache ??= {
  token: null,
  expiresAt: 0,
  pending: null,
});

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const FALLBACK_TOKEN_LIFETIME_MS = 30 * 60 * 1000;

const asRecord = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const findAccountRecord = (
  value: unknown,
  accountId: string,
): JsonRecord | null => {
  const response = asRecord(value);
  if (!response || !Array.isArray(response.data)) return null;

  for (const item of response.data) {
    const account = asRecord(item);
    if (account && String(account.client_account || "").trim() === accountId) {
      return account;
    }
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

const getJwtExpiresAt = (token: string) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return Date.now() + FALLBACK_TOKEN_LIFETIME_MS;

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as unknown;
    const record = asRecord(decoded);
    const expiresAt = Number(record?.exp) * 1000;

    return Number.isFinite(expiresAt) && expiresAt > Date.now()
      ? expiresAt
      : Date.now() + FALLBACK_TOKEN_LIFETIME_MS;
  } catch {
    return Date.now() + FALLBACK_TOKEN_LIFETIME_MS;
  }
};

type AuthConfig = {
  authUrl: string;
  email: string;
  password: string;
  loginField: string;
};

const requestExnessToken = async ({
  authUrl,
  email,
  password,
  loginField,
}: AuthConfig) => {
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

  tokenCache.token = token;
  tokenCache.expiresAt = getJwtExpiresAt(token);
  return token;
};

const getExnessToken = async (config: AuthConfig, forceRefresh = false) => {
  if (forceRefresh) {
    tokenCache.token = null;
    tokenCache.expiresAt = 0;
  }

  if (
    tokenCache.token &&
    Date.now() < tokenCache.expiresAt - TOKEN_REFRESH_BUFFER_MS
  ) {
    return tokenCache.token;
  }

  // Concurrent verification requests share the same authentication request.
  if (tokenCache.pending) return tokenCache.pending;

  tokenCache.pending = requestExnessToken(config);
  try {
    return await tokenCache.pending;
  } finally {
    tokenCache.pending = null;
  }
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

  const authConfig = { authUrl, email, password, loginField };
  const accountsUrl = resolveAccountsUrl(accountId, apiBaseUrl);
  const requestAccounts = async (token: string) => {
    const response = await fetch(accountsUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `JWT ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    return { response, body: await readJson(response) };
  };

  let token = await getExnessToken(authConfig);
  let accountsResult = await requestAccounts(token);

  // A revoked or unexpectedly expired token is refreshed and retried only once.
  if (accountsResult.response.status === 401) {
    token = await getExnessToken(authConfig, true);
    accountsResult = await requestAccounts(token);
  }

  const { response: accountsResponse, body: accountsBody } = accountsResult;

  if (!accountsResponse.ok) {
    throw new Error(
      `Exness Client Accounts request failed (HTTP ${accountsResponse.status}): ${describeApiError(accountsBody)}`,
    );
  }

  const account = findAccountRecord(accountsBody, accountId);
  if (!account) {
    return {
      verified: false as const,
      partnerCode: null,
      accountType: null,
    };
  }

  const partnerCode =
    typeof account.partner_code === "string" ||
    typeof account.partner_code === "number"
      ? String(account.partner_code)
      : null;
  const accountType =
    typeof account.client_account_type === "string"
      ? account.client_account_type.trim() || null
      : null;

  return { verified: true as const, partnerCode, accountType };
};
