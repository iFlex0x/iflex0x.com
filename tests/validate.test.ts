import { describe, expect, it } from "vitest";
import { parseInvoicePayload } from "../functions/_lib/validate";

const valid = {
    number: "2026-1103-01",
    clientName: "Acme",
    clientSub: "Acme Ltd",
    clientLines: ["Line one", "Line two"],
    issuedOn: "2026-11-03",
    dueOn: "2026-12-03",
    items: [{ title: "Edit", desc: "10 min", qty: "1", rate: "100.00" }],
    discount: "0",
    discountLabel: "",
    taxRate: "0",
    note: "",
};

describe("parseInvoicePayload", () => {
    it("accepts a valid payload", () => {
        const result = parseInvoicePayload(valid);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.body.items[0].qtyHundredths).toBe(100);
            expect(result.value.body.items[0].rateCents).toBe(10000);
            expect(result.value.totals.totalCents).toBe(10000);
        }
    });

    it("accepts a null or blank due date", () => {
        expect(parseInvoicePayload({ ...valid, dueOn: null }).ok).toBe(true);
        expect(parseInvoicePayload({ ...valid, dueOn: "" }).ok).toBe(true);
    });

    it("rejects missing, empty, and wrong-type fields", () => {
        expect(parseInvoicePayload({ ...valid, number: "" }).ok).toBe(false);
        expect(parseInvoicePayload({ ...valid, clientName: "" }).ok).toBe(false);
        expect(parseInvoicePayload({ ...valid, clientName: 123 }).ok).toBe(false);
        expect(parseInvoicePayload({ ...valid, items: [] }).ok).toBe(false);
        expect(parseInvoicePayload({ ...valid, items: "x" }).ok).toBe(false);
    });

    it("rejects too many items and lines", () => {
        const items = Array.from({ length: 21 }, () => valid.items[0]);
        expect(parseInvoicePayload({ ...valid, items }).ok).toBe(false);
        expect(parseInvoicePayload({ ...valid, clientLines: Array(6).fill("x") }).ok).toBe(false);
    });

    it("rejects bad decimals and bounds", () => {
        const withQty = (qty: string) => ({ ...valid, items: [{ ...valid.items[0], qty }] });
        const withRate = (rate: string) => ({ ...valid, items: [{ ...valid.items[0], rate }] });
        expect(parseInvoicePayload(withQty("0")).ok).toBe(false);
        expect(parseInvoicePayload(withQty("1.005")).ok).toBe(false);
        expect(parseInvoicePayload(withQty("1000.01")).ok).toBe(false);
        expect(parseInvoicePayload(withQty("1000")).ok).toBe(true);
        expect(parseInvoicePayload(withRate("1000000.01")).ok).toBe(false);
        expect(parseInvoicePayload(withRate("1000000")).ok).toBe(true);
    });

    it("rejects discount over subtotal and bad tax", () => {
        expect(parseInvoicePayload({ ...valid, discount: "100.01" }).ok).toBe(false);
        expect(parseInvoicePayload({ ...valid, taxRate: "100.01" }).ok).toBe(false);
        expect(parseInvoicePayload({ ...valid, taxRate: "100" }).ok).toBe(true);
    });

    it("rejects due before issued and bad dates", () => {
        expect(parseInvoicePayload({ ...valid, dueOn: "2026-11-02" }).ok).toBe(false);
        expect(parseInvoicePayload({ ...valid, issuedOn: "2026-13-01" }).ok).toBe(false);
    });

    it("rejects oversized notes and ignores unknown fields", () => {
        expect(parseInvoicePayload({ ...valid, note: "x".repeat(1001) }).ok).toBe(false);
        expect(parseInvoicePayload({ ...valid, extra: "ignored" }).ok).toBe(true);
    });
});
