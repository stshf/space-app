export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https://assets.science.nasa.gov https://science.nasa.gov https://apod.nasa.gov",
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// _headers ファイルは Worker が作った応答には効かないので、ここで付ける
export function withSecurityHeaders(response, { html = false } = {}) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (html) {
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function json(data, { status = 200, cacheSeconds = 0 } = {}) {
  const response = Response.json(data, {
    status,
    headers: {
      "Cache-Control": cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : "no-store",
    },
  });
  return withSecurityHeaders(response);
}

export function jsonError(status, code, message) {
  return json({ error: { code, message } }, { status });
}
