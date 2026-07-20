const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const getDateParts = (value: Date | string) => {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: Number(match[1]),
        month: Number(match[2]) - 1,
        day: Number(match[3]),
      };
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
};

// A DATE-only subscription remains valid through 23:59:59 Asia/Jakarta.
// Midnight of the following WIB day is 17:00 UTC on the stored end date.
export const getSubscriptionExpiresAt = (endDate: Date | string) => {
  const parts = getDateParts(endDate);
  if (!parts) return null;

  return new Date(Date.UTC(parts.year, parts.month, parts.day, 17));
};

export const getSubscriptionConfigLockAt = (endDate: Date | string) => {
  const expiresAt = getSubscriptionExpiresAt(endDate);
  return expiresAt ? new Date(expiresAt.getTime() - HOUR_MS) : null;
};

export const getSubscriptionTerminationAt = (endDate: Date | string) => {
  const expiresAt = getSubscriptionExpiresAt(endDate);
  return expiresAt ? new Date(expiresAt.getTime() + 3 * DAY_MS) : null;
};

export const isSubscriptionConfigLocked = (
  endDate?: Date | string | null,
  now = new Date(),
) => {
  if (!endDate) return false;
  const lockAt = getSubscriptionConfigLockAt(endDate);
  return Boolean(lockAt && now.getTime() >= lockAt.getTime());
};

