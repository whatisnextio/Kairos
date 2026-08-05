const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.12k.app",
  "https://12k.app",
  "https://kairos-liammcdows-projects.vercel.app",
  "https://kairos-git-main-liammcdows-projects.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const VERCEL_PREVIEW_ORIGIN =
  /^https:\/\/kairos-[a-z0-9-]+-liammcdows-projects\.vercel\.app$/;

export function isAllowedCorsOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return DEFAULT_ALLOWED_ORIGINS.includes(origin) ||
    VERCEL_PREVIEW_ORIGIN.test(origin);
}

export function buildCorsHeaders(
  req: Request,
  allowedHeaders = "authorization, content-type, apikey, x-client-info",
): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": allowedHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };

  if (origin && isAllowedCorsOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function preflightResponse(
  req: Request,
  allowedHeaders = "authorization, content-type, apikey, x-client-info",
): Response {
  const allowed = isAllowedCorsOrigin(req.headers.get("origin"));
  return new Response(null, {
    status: allowed ? 204 : 403,
    headers: buildCorsHeaders(req, allowedHeaders),
  });
}

export function jsonResponse(
  req: Request,
  body: unknown,
  init: ResponseInit = {},
  allowedHeaders = "authorization, content-type, apikey, x-client-info",
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(req, allowedHeaders),
      ...init.headers,
    },
  });
}

export function textResponse(
  req: Request,
  body: string,
  init: ResponseInit = {},
  allowedHeaders = "authorization, content-type, apikey, x-client-info",
): Response {
  return new Response(body, {
    ...init,
    headers: {
      ...buildCorsHeaders(req, allowedHeaders),
      ...init.headers,
    },
  });
}
