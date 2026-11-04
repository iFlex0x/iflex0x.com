import { describe, expect, it } from "vitest";
import { checkCsrf } from "../functions/_lib/csrf";

const origin = "https://invoice.iflex0x.com";

function req(method: string, headers: Record<string, string> = {}): Request {
    return new Request("https://invoice.iflex0x.com/admin/api/invoices", { method, headers });
}

const valid = {
    Origin: origin,
    "X-Admin-Request": "1",
};

describe("checkCsrf", () => {
    it("allows reads", () => {
        expect(checkCsrf(req("GET"), origin)).toEqual({ ok: true });
    });

    it("allows a same-origin write", () => {
        expect(checkCsrf(req("POST", valid), origin)).toEqual({ ok: true });
        expect(checkCsrf(req("PUT", valid), origin)).toEqual({ ok: true });
    });

    it("rejects a wrong origin", () => {
        expect(checkCsrf(req("POST", { ...valid, Origin: "https://evil.example" }), origin).ok).toBe(false);
    });

    it("rejects a missing custom header", () => {
        expect(checkCsrf(req("POST", { Origin: origin }), origin).ok).toBe(false);
    });

    it("rejects an unsupported method", () => {
        expect(checkCsrf(req("DELETE", valid), origin).ok).toBe(false);
    });
});
