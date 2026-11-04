import { describe, expect, it } from "vitest";
import { checkCsrf } from "../functions/_lib/csrf";

const origin = "https://invoice.iflex0x.com";

function req(method: string, headers: Record<string, string> = {}): Request {
    return new Request("https://invoice.iflex0x.com/admin/api/invoices", { method, headers });
}

const valid = {
    "Content-Type": "application/json",
    Origin: origin,
    "Sec-Fetch-Site": "same-origin",
    "X-Admin-Request": "1",
};

describe("checkCsrf", () => {
    it("allows reads", () => {
        expect(checkCsrf(req("GET"), origin)).toEqual({ ok: true });
    });

    it("allows a valid same-origin write", () => {
        expect(checkCsrf(req("POST", valid), origin)).toEqual({ ok: true });
    });

    it("rejects a wrong origin", () => {
        expect(checkCsrf(req("POST", { ...valid, Origin: "https://evil.example" }), origin).ok).toBe(false);
    });

    it("rejects a missing custom header", () => {
        const headers = { ...valid };
        delete (headers as Record<string, string>)["X-Admin-Request"];
        expect(checkCsrf(req("POST", headers), origin).ok).toBe(false);
    });

    it("rejects a wrong content type", () => {
        expect(checkCsrf(req("POST", { ...valid, "Content-Type": "text/plain" }), origin).ok).toBe(false);
    });

    it("rejects a cross-site fetch", () => {
        expect(checkCsrf(req("POST", { ...valid, "Sec-Fetch-Site": "cross-site" }), origin).ok).toBe(false);
    });

    it("rejects an unsupported method", () => {
        expect(checkCsrf(req("DELETE", valid), origin).ok).toBe(false);
    });
});