import sanitizeHtml from "sanitize-html";

export const RESERVED_CMS_SLUGS = new Set([
  "admin",
  "api",
  "en",
  "member",
]);

export const normalizeCmsSlug = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export const sanitizeCmsHtml = (value: unknown) =>
  sanitizeHtml(String(value || ""), {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "hr",
      "code",
      "pre",
      "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank" && {
            rel: "noopener noreferrer",
          }),
        },
      }),
    },
  });

export const cmsHtmlHasContent = (value: string) =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .trim().length > 0;

export type CmsPageInput = {
  slug: string;
  titleEn: string;
  titleId: string;
  contentEn: string;
  contentId: string;
  metaTitleEn: string;
  metaTitleId: string;
  metaDescriptionEn: string;
  metaDescriptionId: string;
  isPublished: boolean;
};

export const parseCmsPageInput = (body: Record<string, unknown>) => {
  const input: CmsPageInput = {
    slug: normalizeCmsSlug(body.slug),
    titleEn: String(body.titleEn || "").trim(),
    titleId: String(body.titleId || "").trim(),
    contentEn: sanitizeCmsHtml(body.contentEn),
    contentId: sanitizeCmsHtml(body.contentId),
    metaTitleEn: String(body.metaTitleEn || "").trim(),
    metaTitleId: String(body.metaTitleId || "").trim(),
    metaDescriptionEn: String(body.metaDescriptionEn || "").trim(),
    metaDescriptionId: String(body.metaDescriptionId || "").trim(),
    isPublished: body.isPublished === true,
  };

  const errors: string[] = [];
  if (!input.slug) errors.push("Slug is required.");
  if (RESERVED_CMS_SLUGS.has(input.slug)) {
    errors.push(`The slug \"${input.slug}\" is reserved.`);
  }
  if (!input.titleId) errors.push("Indonesian title is required.");
  if (!input.titleEn) errors.push("English title is required.");
  if (!cmsHtmlHasContent(input.contentId)) {
    errors.push("Indonesian content is required.");
  }
  if (!cmsHtmlHasContent(input.contentEn)) {
    errors.push("English content is required.");
  }
  if (input.titleId.length > 191 || input.titleEn.length > 191) {
    errors.push("Page titles cannot exceed 191 characters.");
  }
  if (input.metaTitleId.length > 191 || input.metaTitleEn.length > 191) {
    errors.push("Meta titles cannot exceed 191 characters.");
  }
  if (
    input.metaDescriptionId.length > 500 ||
    input.metaDescriptionEn.length > 500
  ) {
    errors.push("Meta descriptions cannot exceed 500 characters.");
  }

  return { input, errors };
};

