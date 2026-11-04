export const INVOICE_HOST = "invoice.iflex0x.com";
export const APEX_HOST = "iflex0x.com";

export type RouteDecision =
    | { kind: "pass" }
    | { kind: "not-found" }
    | { kind: "robots" }
    | { kind: "redirect"; host: string };

const PUBLIC_PREFIXES = ["/_astro/", "/invoice/"];
const PUBLIC_FILES = new Set(["/favicon.png", "/logo.png", "/hugo.png", "/signature.png", "/rat.png"]);

export function isInvoicePath(pathname: string): boolean {
    return pathname.startsWith("/i/");
}

export function isAdminPath(pathname: string): boolean {
    return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isPublicAsset(pathname: string): boolean {
    return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || PUBLIC_FILES.has(pathname);
}

export function decideRoute(hostname: string, pathname: string): RouteDecision {
    if (pathname.startsWith("/cdn-cgi/")) return { kind: "pass" };

    if (hostname.endsWith(".pages.dev")) {
        const host = isInvoicePath(pathname) || isAdminPath(pathname) ? INVOICE_HOST : APEX_HOST;
        return { kind: "redirect", host };
    }

    if (hostname === INVOICE_HOST) {
        if (pathname === "/robots.txt") return { kind: "robots" };
        if (isInvoicePath(pathname) || isAdminPath(pathname) || isPublicAsset(pathname)) return { kind: "pass" };
        return { kind: "not-found" };
    }

    if (hostname === APEX_HOST || hostname === `www.${APEX_HOST}`) {
        if (isInvoicePath(pathname) || isAdminPath(pathname)) return { kind: "not-found" };
        return { kind: "pass" };
    }

    return { kind: "pass" };
}