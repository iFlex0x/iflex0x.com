import { describe, expect, it } from "vitest";
import { onRequest } from "../functions/i/[token]";
import type { Env } from "../functions/_lib/types";
import type { InvoiceRow } from "../functions/_lib/types";

const row: InvoiceRow = {
    id: "id-1",
    token: "AAAAAAAAAAAAAAAAAAAAAA",
    number: "2026-1103-01",
    client_name: "Acme",
    client_sub: "",
    client_lines: "[]",
    issued_on: "2026-11-03",
    due_on: "2099-01-01",
    status: "open",
    paid_on: null,
    expires_on: "2099-01-01",
    revoked_at: null,
    body: JSON.stringify({
        items: [{ title: "Edit", desc: "", qtyHundredths: 100, rateCents: 10000 }],
        discountCents: 0,
        discountLabel: "",
        taxBp: 0,
        note: "",
    }),
    subtotal_cents: 10000,
    discount_cents: 0,
    tax_cents: 0,
    total_cents: 10000,
    created_at: "2026-11-03T00:00:00Z",
    updated_at: "2026-11-03T00:00:00Z",
};

function fakeDb(value: InvoiceRow | null): D1Database {
    return {
        prepare: () => ({
            bind: () => ({
                first: async () => value,
            }),
        }),
    } as unknown as D1Database;
}

function context(value: InvoiceRow | null, opts: { token?: string; method?: string } = {}) {
    const token = opts.token ?? row.token;
    const request = new Request(`https://invoice.iflex0x.com/i/${token}`, {
        method: opts.method ?? "GET",
    });
    return {
        request,
        env: { INVOICES_DB: fakeDb(value) } as unknown as Env,
        params: { token },
        data: {},
        next: async () => new Response(),
        waitUntil: () => {},
        passThroughOnException: () => {},
    } as unknown as EventContext<Env, string, Record<string, unknown>>;
}

describe("invoice route", () => {
    it("404s a malformed token before touching the db", async () => {
        const res = await onRequest(context(null, { token: "short" }));
        expect(res.status).toBe(404);
    });

    it("404s an unknown token", async () => {
        const res = await onRequest(context(null));
        expect(res.status).toBe(404);
    });

    it("410s an expired link", async () => {
        const res = await onRequest(context({ ...row, expires_on: "2020-01-01" }));
        expect(res.status).toBe(410);
    });

    it("410s a revoked link", async () => {
        const res = await onRequest(context({ ...row, revoked_at: "2026-11-03T00:00:00Z" }));
        expect(res.status).toBe(410);
    });

    it("renders a live invoice with security headers", async () => {
        const res = await onRequest(context(row));
        expect(res.status).toBe(200);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(res.headers.get("content-security-policy")).toContain("nonce-");
        expect(await res.text()).toContain("Acme");
    });

    it("rejects writes", async () => {
        const res = await onRequest(context(row, { method: "POST" }));
        expect(res.status).toBe(405);
        expect(res.headers.get("allow")).toBe("GET, HEAD");
    });

    it("drops the body for HEAD", async () => {
        const res = await onRequest(context(row, { method: "HEAD" }));
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("");
    });
});
