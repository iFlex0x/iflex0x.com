import { describe, expect, it } from "vitest";
import { isUniqueNumberError, nextNumber, parseBody, parseLines } from "../functions/_lib/db";

function fakeDb(rows: { number: string }[]): D1Database {
    return {
        prepare: () => ({
            bind: () => ({
                all: async () => ({ results: rows }),
            }),
        }),
    } as unknown as D1Database;
}

describe("nextNumber", () => {
    it("starts at 01", async () => {
        expect(await nextNumber(fakeDb([]), "2026-11-03")).toBe("2026-1103-01");
    });

    it("increments the numeric suffix", async () => {
        expect(await nextNumber(fakeDb([{ number: "2026-1103-09" }]), "2026-11-03")).toBe(
            "2026-1103-10",
        );
    });

    it("crosses 99 without a duplicate", async () => {
        expect(await nextNumber(fakeDb([{ number: "2026-1103-99" }]), "2026-11-03")).toBe(
            "2026-1103-100",
        );
        expect(
            await nextNumber(
                fakeDb([{ number: "2026-1103-100" }, { number: "2026-1103-99" }]),
                "2026-11-03",
            ),
        ).toBe("2026-1103-101");
    });

    it("ignores a number from another day", async () => {
        expect(await nextNumber(fakeDb([{ number: "2026-1102-07" }]), "2026-11-03")).toBe(
            "2026-1103-01",
        );
    });
});

describe("parseBody", () => {
    it("returns the typed body", () => {
        const body = { items: [], discountCents: 0, discountLabel: "", taxBp: 0, note: "" };
        expect(parseBody({ body: JSON.stringify(body) })).toEqual(body);
    });

    it("throws on a non-object body", () => {
        expect(() => parseBody({ body: "[]" })).toThrow();
        expect(() => parseBody({ body: "null" })).toThrow();
    });
});

describe("parseLines", () => {
    it("returns only strings", () => {
        expect(parseLines({ client_lines: '["a",1,null,"b"]' })).toEqual(["a", "b"]);
        expect(parseLines({ client_lines: "{}" })).toEqual([]);
    });
});

describe("isUniqueNumberError", () => {
    it("matches the d1 message only", () => {
        expect(
            isUniqueNumberError(new Error("D1_ERROR: UNIQUE constraint failed: invoices.number")),
        ).toBe(true);
        expect(isUniqueNumberError(new Error("UNIQUE constraint failed: invoices.token"))).toBe(
            false,
        );
        expect(isUniqueNumberError("nope")).toBe(false);
    });
});
