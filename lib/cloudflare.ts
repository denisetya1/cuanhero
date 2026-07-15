type CloudflareError = {
  code?: number;
  message?: string;
};

type CloudflareResponse<T> = {
  success: boolean;
  errors?: CloudflareError[];
  result: T;
};

type CloudflareDnsRecord = {
  id: string;
  name: string;
  content: string;
};

const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";

const getCloudflareConfig = () => {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const zoneName = (
    process.env.CLOUDFLARE_ZONE_NAME || "cuanhero.com"
  )
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();
  const subdomainPrefix = (
    process.env.PYSYNC_SUBDOMAIN_PREFIX || "mt5-vps"
  )
    .trim()
    .toLowerCase();

  if (!apiToken || !zoneId) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID must be configured.",
    );
  }

  if (!zoneName || !/^[a-z0-9.-]+$/.test(zoneName)) {
    throw new Error("CLOUDFLARE_ZONE_NAME is invalid.");
  }

  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(subdomainPrefix)) {
    throw new Error("PYSYNC_SUBDOMAIN_PREFIX is invalid.");
  }

  return { apiToken, zoneId, zoneName, subdomainPrefix };
};

const cloudflareRequest = async <T>(
  path: string,
  apiToken: string,
  init?: RequestInit,
) => {
  const response = await fetch(`${CLOUDFLARE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const data = (await response.json()) as CloudflareResponse<T>;
  if (!response.ok || !data.success) {
    const detail =
      data.errors
        ?.map((error) => error.message || String(error.code || "Unknown error"))
        .join(", ") || `Cloudflare returned HTTP ${response.status}.`;
    throw new Error(detail);
  }

  return data.result;
};

export const upsertPySyncDnsRecord = async (
  serverId: number,
  publicIp: string,
  ipVersion: 4 | 6,
) => {
  const { apiToken, zoneId, zoneName, subdomainPrefix } =
    getCloudflareConfig();
  const recordType = ipVersion === 6 ? "AAAA" : "A";
  const hostname = `${subdomainPrefix}-${serverId}.${zoneName}`;
  const query = new URLSearchParams({ type: recordType, name: hostname });

  const records = await cloudflareRequest<CloudflareDnsRecord[]>(
    `/zones/${zoneId}/dns_records?${query.toString()}`,
    apiToken,
  );
  const payload = JSON.stringify({
    type: recordType,
    name: hostname,
    content: publicIp,
    ttl: 1,
    proxied: true,
  });

  if (records[0]) {
    await cloudflareRequest<CloudflareDnsRecord>(
      `/zones/${zoneId}/dns_records/${records[0].id}`,
      apiToken,
      { method: "PUT", body: payload },
    );
  } else {
    await cloudflareRequest<CloudflareDnsRecord>(
      `/zones/${zoneId}/dns_records`,
      apiToken,
      { method: "POST", body: payload },
    );
  }

  return hostname;
};

export const deletePySyncDnsRecord = async (
  serverId: number,
  hostname: string,
) => {
  const { apiToken, zoneId, zoneName, subdomainPrefix } =
    getCloudflareConfig();
  const expectedHostname = `${subdomainPrefix}-${serverId}.${zoneName}`;

  if (hostname.toLowerCase() !== expectedHostname) return false;

  for (const recordType of ["A", "AAAA"] as const) {
    const query = new URLSearchParams({
      type: recordType,
      name: expectedHostname,
    });
    const records = await cloudflareRequest<CloudflareDnsRecord[]>(
      `/zones/${zoneId}/dns_records?${query.toString()}`,
      apiToken,
    );

    for (const record of records) {
      await cloudflareRequest<CloudflareDnsRecord>(
        `/zones/${zoneId}/dns_records/${record.id}`,
        apiToken,
        { method: "DELETE" },
      );
    }
  }

  return true;
};
