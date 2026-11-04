export type PageKind = "invoice" | "admin" | "error";

const BASE_CSP =
    "default-src 'none'; img-src 'self'; font-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests";

const SECURITY_HEADERS: Record<string, string> = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "geolocation=(), camera=(), microphone=(), payment=()",
};

export function makeNonce(): string {
    return crypto.randomUUID();
}

export function cspFor(kind: PageKind, nonce?: string): string {
    if (kind === "invoice") {
        return `${BASE_CSP}; script-src 'self' 'nonce-${nonce}'; connect-src 'none'; form-action 'none'`;
    }
    if (kind === "admin") {
        return `${BASE_CSP}; script-src 'self' 'nonce-${nonce}'; connect-src 'self'; form-action 'self'`;
    }
    return `${BASE_CSP}; script-src 'none'`;
}

export function htmlResponse(
    html: string,
    opts: { kind: PageKind; nonce?: string; status?: number; head?: boolean },
): Response {
    const headers = new Headers({
        "Content-Type": "text/html; charset=utf-8",
        ...SECURITY_HEADERS,
        "Content-Security-Policy": cspFor(opts.kind, opts.nonce),
    });

    return new Response(opts.head ? null : html, { status: opts.status ?? 200, headers });
}

export function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
        },
    });
}

export function textResponse(text: string, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(text, {
        status,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "X-Robots-Tag": "noindex",
            ...headers,
        },
    });
}