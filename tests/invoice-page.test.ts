import { describe, expect, it } from "vitest";
import { renderInvoicePage } from "../functions/_lib/invoice-page";
import { addDaysIso } from "../functions/_lib/dates";
import { CONFIG } from "../functions/_lib/config";
import type { InvoiceRow } from "../functions/_lib/types";

const issued = "2026-11-03";
const expires = addDaysIso(issued, CONFIG.expiryDays);

const base: InvoiceRow = {
    id: "id-1",
    token: "AAAAAAAAAAAAAAAAAAAAAA",
    number: "2026-1103-01",
    client_name: "Acme",
    client_sub: "Acme Ltd",
    client_lines: '["Line one","Line two"]',
    issued_on: issued,
    due_on: "2026-12-03",
    status: "open",
    paid_on: null,
    expires_on: expires,
    revoked_at: null,
    body: JSON.stringify({
        items: [{ title: "Edit", desc: "10 min", qtyHundredths: 100, rateCents: 10000 }],
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

const opts = { nonce: "abc123", today: issued };

describe("renderInvoicePage", () => {
    it("renders a due invoice with the exact PayPal amount", () => {
        const html = renderInvoicePage(base, opts);
        expect(html).toContain("2026-1103-01");
        expect(html).toContain("Acme");
        expect(html).toContain("$100.00");
        expect(html).toContain(`https://paypal.me/${CONFIG.paypalHandle}/100.00USD`);
        expect(html).toContain('data-status="due"');
        expect(html).toContain("03 NOV 2026");
    });

    it("renders the stored totals, not a fresh body recalculation", () => {
        const html = renderInvoicePage(
            { ...base, subtotal_cents: 99900, tax_cents: 100, total_cents: 100000 },
            opts,
        );
        expect(html).toContain("$1,000.00");
        expect(html).toContain(`https://paypal.me/${CONFIG.paypalHandle}/1000.00USD`);
    });

    it("hides payment on paid invoices", () => {
        const html = renderInvoicePage({ ...base, status: "paid", paid_on: issued }, opts);
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
        const html = renderInvoicePage(
            { ...base, subtotal_cents: 0, discount_cents: 0, tax_cents: 0, total_cents: 0 },
            opts,
        );
        expect(html).not.toContain("paypal.me");
        expect(html).not.toContain("qr.png");
    });

    it("marks an overdue invoice", () => {
        const html = renderInvoicePage({ ...base, due_on: "2026-11-02" }, opts);
        expect(html).toContain('data-status="overdue"');
    });

    it("says on receipt when there is no due date", () => {
        const html = renderInvoicePage({ ...base, due_on: null }, opts);
        expect(html).toContain("due on receipt");
        expect(html).not.toContain("ON RECEIPT");
    });

    it("skips an empty client line paragraph", () => {
        const html = renderInvoicePage({ ...base, client_lines: "[]" }, opts);
        expect(html).not.toContain("<p></p>");
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

    it("ships the QR at its real size", () => {
        const html = renderInvoicePage(base, opts);
        expect(html).toContain('width="240" height="240"');
        expect(html).not.toContain("the QR opens PayPal");
    });
});
