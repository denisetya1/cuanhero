export const handleRes = async (res: Response) => {
  const text = await res.text();
  let resJson = null;

  if (text) {
    try {
      resJson = JSON.parse(text);
    } catch {
      const htmlTitle =
        text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
        text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
      const responseLabel = htmlTitle
        ?.replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      throw new Error(
        `Server returned a non-JSON response (HTTP ${res.status})${
          responseLabel ? `: ${responseLabel}` : "."
        }`,
      );
    }
  }

  if (res.ok) {
    return resJson;
  }

  const message =
    resJson &&
    typeof resJson === "object" &&
    "message" in resJson &&
    typeof resJson.message === "string" &&
    resJson.message
      ? resJson.message
      : res.statusText || "Request failed.";

  throw new Error(message);
};

export const buildResponse = (data: unknown) => {
  return Response.json({
    code: "SUCCESS",
    message: "",
    errors: [],
    data,
  });
};

export const buildErrorResponse = (
  code: string,
  message: string,
  errorsMsgs: string[],
  status: number = 400,
) => {
  return Response.json(
    {
      code,
      message,
      errors: errorsMsgs,
    },
    { status },
  );
};

export const notAuthorizeResponse = () => {
  return buildErrorResponse(
    "NOT_AUTHORIZED",
    "This operation is not allowed.",
    [],
    401,
  );
};

export const dataNotExistReponse = () => {
  return buildErrorResponse(
    "DATA_NOT_EXISTS",
    "Data tidak ditemukan!",
    [],
    404,
  );
};

export const mismatchSession = () => {
  return buildErrorResponse(
    "SESSION_MISMATCH",
    "Sesi tidak valid untuk permintaan ini.!",
    [],
    403,
  );
};
