import { describe, expect, it } from "vitest";
import { cspFor, htmlResponse, jsonResponse, textResponse } from "../functions/_lib/http";

describe("cspFor", () => {
    it("pins the invoice CSP", () => {
        const csp = cspFor("invoice", "abc123");
        expect(csp).toContain("default-src 'none'");
        expect(csp).toContain("script-src 'self' 'nonce-abc123'");
        expect(csp).toContain("frame-ancestors 'none'");
        expect(csp).toContain("form-action 'none'");
        expect(csp).toContain("connect-src 'none'");
    });

    it("pins the admin CSP", () => {
        const csp = cspFor("admin", "abc123");
        expect(csp).toContain("connect-src 'self'");
        expect(csp).toContain("form-action 'self'");
    });

    it("pins the error CSP", () => {
        const csp = cspFor("error");
        expect(csp).toContain("script-src 'none'");
        expect(csp).not.toContain("nonce");
    });
});

describe("responses", () => {
    it("sets invoice security headers", () => {
        const res = htmlResponse("<p>x</p>", { kind: "invoice", nonce: "abc" });
        expect(res.headers.get("content-type")).toContain("text/html");
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(res.headers.get("referrer-policy")).toBe("no-referrer");
        expect(res.headers.get("x-robots-tag")).toContain("noindex");
        expect(res.headers.get("x-frame-options")).toBe("DENY");
        expect(res.headers.get("content-security-policy")).toContain("nonce-abc");
    });

    it("drops the body for HEAD", async () => {
        const res = htmlResponse("<p>x</p>", { kind: "invoice", nonce: "abc", head: true });
        expect(await res.text()).toBe("");
    });

    it("marks JSON no-store", () => {
        const res = jsonResponse({ ok: true });
        expect(res.headers.get("content-type")).toContain("application/json");
        expect(res.headers.get("cache-control")).toBe("no-store");
    });

    it("carries Allow on 405", () => {
        const res = textResponse("method not allowed", 405, { Allow: "GET, HEAD" });
        expect(res.headers.get("allow")).toBe("GET, HEAD");
    });
});