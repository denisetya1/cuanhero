export type LocalizedText = {
  en: string;
  id: string;
};

export const normalizeLocalizedText = (value: unknown): LocalizedText => {
  if (typeof value === "string") {
    return { en: value, id: value };
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const localized = value as Record<string, unknown>;
    return {
      en: typeof localized.en === "string" ? localized.en : "",
      id: typeof localized.id === "string" ? localized.id : "",
    };
  }

  return { en: "", id: "" };
};

export const localizedTextToJson = (
  value: unknown,
): Record<string, string> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const result = Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        ([key, text]) => key.trim() && typeof text === "string" && text.trim(),
      )
      .map(([key, text]) => [key.trim(), (text as string).trim()]),
  );

  return Object.keys(result).length ? result : null;
};

export const getLocalizedText = (
  value: unknown,
  locale: keyof LocalizedText = "id",
) => {
  const localized = normalizeLocalizedText(value);
  return localized[locale] || localized[locale === "id" ? "en" : "id"];
};
