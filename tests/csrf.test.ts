import { describe, expect, it } from "vitest";
import { checkCsrf } from "../functions/_lib/csrf";

const origin = "https://invoice.iflex0x.com";

function req(method: string, headers: Record<string, string> = {}): Request {
    return new Request("https://invoice.iflex0x.com/admin/api/invoices", { method, headers });
}

const valid = {
    Origin: origin,
    "Sec-Fetch-Site": "same-origin",
    "X-Admin-Request": "1",
    "Content-Type": "application/json",
};

describe("checkCsrf", () => {
    it("allows reads", () => {
        expect(checkCsrf(req("GET"), origin)).toEqual({ ok: true });
        expect(checkCsrf(req("HEAD"), origin)).toEqual({ ok: true });
        expect(checkCsrf(req("OPTIONS"), origin)).toEqual({ ok: true });
    });

    it("allows a same-origin write", () => {
        expect(checkCsrf(req("POST", valid), origin)).toEqual({ ok: true });
        expect(checkCsrf(req("PUT", valid), origin)).toEqual({ ok: true });
    });

    it("allows a json content type with a charset", () => {
        expect(
            checkCsrf(
                req("POST", { ...valid, "Content-Type": "application/json; charset=utf-8" }),
                origin,
            ),
        ).toEqual({ ok: true });
    });

    it("rejects a wrong origin", () => {
        expect(
            checkCsrf(req("POST", { ...valid, Origin: "https://evil.example" }), origin),
        ).toEqual({
            ok: false,
            error: "origin mismatch",
        });
    });

    it("rejects a missing or cross-site sec-fetch-site", () => {
        const missing = {
            Origin: origin,
            "X-Admin-Request": "1",
            "Content-Type": "application/json",
        };
        expect(checkCsrf(req("POST", missing), origin)).toEqual({
            ok: false,
            error: "cross-site request",
        });
        expect(
            checkCsrf(req("POST", { ...valid, "Sec-Fetch-Site": "cross-site" }), origin),
        ).toEqual({
            ok: false,
            error: "cross-site request",
        });
    });

    it("rejects a missing custom header", () => {
        const missing = {
            Origin: origin,
            "Sec-Fetch-Site": "same-origin",
            "Content-Type": "application/json",
        };
        expect(checkCsrf(req("POST", missing), origin)).toEqual({
            ok: false,
            error: "missing admin header",
        });
    });

    it("rejects a non-json content type", () => {
        expect(checkCsrf(req("POST", { ...valid, "Content-Type": "text/plain" }), origin)).toEqual({
            ok: false,
            error: "content type must be json",
        });
    });

    it("leaves method rejection to the route handlers", () => {
        expect(checkCsrf(req("DELETE", valid), origin)).toEqual({ ok: true });
    });
});
