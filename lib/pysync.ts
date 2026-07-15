export const PYSYNC_API_KEY =
  process.env.PYSYNC_API_KEY ||
  "622ccdb5284db76ed586eb95804e00381f28ad8338dbfbfba325f97cd99cc399";

export const getPySyncBaseUrl = (address: string) => {
  const trimmedAddress = address.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmedAddress)) return trimmedAddress;

  const host = trimmedAddress.split(":")[0];
  const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  return `${isIpAddress ? "http" : "https"}://${trimmedAddress}`;
};

export const getPySyncServerAddress = (server: {
  domain?: string | null;
  ipAddress: string;
}) => server.domain?.trim() || server.ipAddress.trim();
