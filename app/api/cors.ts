/**
 * CORS設定
 * 本番環境のサーバーIP (172.16.2.222) からのアクセスを許可
 */

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://172.16.2.222:3500",
  "https://172.16.2.222:3500",
  "http://192.168.179.2:3500",
  "https://192.168.179.2:3500",
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  // オリジンが許可リストに含まれている場合、そのオリジンを許可
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function corsResponse(
  body: BodyInit | null,
  init: ResponseInit,
  origin: string | null
): Response {
  const corsHeaders = getCorsHeaders(origin);
  const headers = new Headers(init.headers);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(body, {
    ...init,
    headers,
  });
}
