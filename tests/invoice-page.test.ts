import { describe, expect, it } from "vitest";
import { renderInvoicePage } from "../functions/_lib/invoice-page";
import type { InvoiceRow } from "../functions/_lib/types";

const base: InvoiceRow = {
    id: "id-1",
    token: "AAAAAAAAAAAAAAAAAAAAAA",
    number: "2026-1103-01",
    client_name: "Acme",
    client_sub: "Acme Ltd",
    client_lines: '["Line one","Line two"]',
    issued_on: "2026-11-03",
    due_on: "2026-12-03",
    status: "open",
    paid_on: null,
    expires_on: "2027-02-01",
    revoked_at: null,
    body: JSON.stringify({
        items: [{ title: "Edit", desc: "10 min", qtyHundredths: 100, rateCents: 10000 }],
        discountCents: 0,
        discountLabel: "",
        taxBp: 0,
        note: "",
    }),
    total_cents: 10000,
    created_at: "2026-11-03T00:00:00Z",
    updated_at: "2026-11-03T00:00:00Z",
};

const opts = { nonce: "abc123", today: "2026-11-03" };

describe("renderInvoicePage", () => {
    it("renders a due invoice with the exact PayPal amount", () => {
        const html = renderInvoicePage(base, opts);
        expect(html).toContain("2026-1103-01");
        expect(html).toContain("Acme");
        expect(html).toContain("$100.00");
        expect(html).toContain("https://paypal.me/iflex8/100.00USD");
        expect(html).toContain('data-status="due"');
        expect(html).toContain("03 NOV 2026");
    });

    it("hides payment on paid invoices", () => {
        const html = renderInvoicePage({ ...base, status: "paid", paid_on: "2026-11-03" }, opts);
        expect(html).toContain('data-status="paid"');
        expect(html).toContain("paid on 03 NOV 2026");
        expect(html).not.toContain("paypal.me");
        expect(html).not.toContain("qr.png");
    });

    it("hides the payment card on void invoices", () => {
        const html = renderInvoicePage({ ...base, status: "void" }, opts);
        expect(html).toContain('data-status="void"');
        expect(html).not.toContain("paypal.me");
    });

    it("hides payment when the total is zero", () => {
        const html = renderInvoicePage({ ...base, total_cents: 0, body: base.body.replace("10000", "0") }, opts);
        expect(html).not.toContain("paypal.me");
        expect(html).not.toContain("qr.png");
    });

    it("marks an overdue invoice", () => {
        const html = renderInvoicePage({ ...base, due_on: "2026-11-02" }, opts);
        expect(html).toContain('data-status="overdue"');
    });

    it("escapes client values", () => {
        const html = renderInvoicePage({ ...base, client_name: "<script>alert(1)</script>" }, opts);
        expect(html).not.toContain("<script>alert(1)</script>");
        expect(html).toContain("&lt;script&gt;");
    });

    it("keeps the print button hidden until the script reveals it", () => {
        const html = renderInvoicePage(base, opts);
        expect(html).toMatch(/id="print"[^>]*hidden/);
    });

    it("ships the QR at the rendered size", () => {
        const html = renderInvoicePage(base, opts);
        expect(html).toContain('width="200" height="200"');
        expect(html).not.toContain("the QR opens PayPal");
    });
});
