import { CONFIG } from "./config";

export type RouteDecision =
    | { kind: "pass" }
    | { kind: "not-found" }
    | { kind: "robots" }
    | { kind: "redirect"; host: string };

function isInvoicePath(pathname: string): boolean {
    return pathname.startsWith("/i/");
}

function isAdminPath(pathname: string): boolean {
    return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function decideRoute(hostname: string, pathname: string): RouteDecision {
    if (pathname.startsWith("/cdn-cgi/")) return { kind: "pass" };

    if (hostname === "localhost" || hostname === "127.0.0.1") return { kind: "pass" };

    if (hostname.endsWith(".pages.dev")) {
        const host =
            isInvoicePath(pathname) || isAdminPath(pathname) ? CONFIG.invoiceHost : CONFIG.domain;
        return { kind: "redirect", host };
    }

    if (hostname === CONFIG.invoiceHost) {
        if (pathname === "/robots.txt") return { kind: "robots" };
        if (isInvoicePath(pathname) || isAdminPath(pathname)) return { kind: "pass" };
        return { kind: "not-found" };
    }

    if (hostname === CONFIG.domain || hostname === `www.${CONFIG.domain}`) {
        if (isInvoicePath(pathname) || isAdminPath(pathname)) return { kind: "not-found" };
        return { kind: "pass" };
    }

    return { kind: "not-found" };
}
