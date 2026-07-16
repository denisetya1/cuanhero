const DEFAULT_MEMBER_REDIRECT = "/member/home";
const REDIRECT_BASE_URL = "https://redirect.cuanhero.local";

export const sanitizeMemberRedirect = (value?: string | null) => {
  if (!value) return DEFAULT_MEMBER_REDIRECT;

  const redirect = value.trim();

  // Only accept a local absolute path. Reject protocol-relative URLs,
  // backslash normalization tricks, control characters, and oversized input.
  if (
    !redirect.startsWith("/") ||
    redirect.startsWith("//") ||
    redirect.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(redirect) ||
    redirect.length > 2048
  ) {
    return DEFAULT_MEMBER_REDIRECT;
  }

  try {
    const parsed = new URL(redirect, REDIRECT_BASE_URL);
    const isMemberPath =
      parsed.pathname === "/member" || parsed.pathname.startsWith("/member/");

    if (parsed.origin !== REDIRECT_BASE_URL || !isMemberPath) {
      return DEFAULT_MEMBER_REDIRECT;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_MEMBER_REDIRECT;
  }
};
