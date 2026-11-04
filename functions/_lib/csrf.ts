export type CsrfResult = { ok: true } | { ok: false; error: string };

export function checkCsrf(request: Request, expectedOrigin: string): CsrfResult {
    const method = request.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return { ok: true };
    if (method !== "POST" && method !== "PUT") return { ok: false, error: "method not allowed" };

    if (request.headers.get("Origin") !== expectedOrigin) return { ok: false, error: "origin mismatch" };
    if (request.headers.get("X-Admin-Request") !== "1") return { ok: false, error: "missing admin header" };

    return { ok: true };
}
