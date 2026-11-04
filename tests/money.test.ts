import { describe, expect, it } from "vitest";
import { computeTotals, formatUsd, itemAmountCents } from "../functions/_lib/money";

describe("itemAmountCents", () => {
    it("multiplies qty hundredths by cents", () => {
        expect(itemAmountCents(100, 10000)).toBe(10000);
        expect(itemAmountCents(150, 10000)).toBe(15000);
    });

    it("rounds half up at the cent", () => {
        expect(itemAmountCents(1, 999)).toBe(10);
        expect(itemAmountCents(1, 1)).toBe(0);
    });
});

describe("computeTotals", () => {
    it("applies discount before tax", () => {
        const totals = computeTotals({
            items: [{ title: "Edit", desc: "", qtyHundredths: 100, rateCents: 10000 }],
            discountCents: 5000,
            discountLabel: "first project",
            taxBp: 2500,
            note: "",
        });
        expect(totals).toEqual({
            subtotalCents: 10000,
            discountCents: 5000,
            taxableCents: 5000,
            taxCents: 1250,
            totalCents: 6250,
        });
    });

    it("clamps discount to subtotal", () => {
        const totals = computeTotals({
            items: [{ title: "Edit", desc: "", qtyHundredths: 100, rateCents: 10000 }],
            discountCents: 20000,
            discountLabel: "",
            taxBp: 0,
            note: "",
        });
        expect(totals.discountCents).toBe(10000);
        expect(totals.totalCents).toBe(0);
    });

    it("sums multiple items and rounds tax", () => {
        const totals = computeTotals({
            items: [
                { title: "A", desc: "", qtyHundredths: 100, rateCents: 3333 },
                { title: "B", desc: "", qtyHundredths: 250, rateCents: 1000 },
            ],
            discountCents: 0,
            discountLabel: "",
            taxBp: 333,
            note: "",
        });
        expect(totals.subtotalCents).toBe(5833);
        expect(totals.taxCents).toBe(194);
        expect(totals.totalCents).toBe(6027);
    });
});

describe("formatUsd", () => {
    it("formats cents with separators", () => {
        expect(formatUsd(0)).toBe("$0.00");
        expect(formatUsd(100)).toBe("$1.00");
        expect(formatUsd(123456)).toBe("$1,234.56");
        expect(formatUsd(-100)).toBe("-$1.00");
    });
});