import { describe, expect, it } from "vitest";
import { generateToken, isToken } from "../functions/_lib/token";

describe("token", () => {
    it("is 22 base64url chars", () => {
        const token = generateToken();
        expect(token).toHaveLength(22);
        expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    });

    it("does not repeat", () => {
        const tokens = new Set(Array.from({ length: 100 }, generateToken));
        expect(tokens.size).toBe(100);
    });

    it("rejects malformed values", () => {
        expect(isToken("a".repeat(22))).toBe(true);
        expect(isToken("a".repeat(21))).toBe(false);
        expect(isToken("a".repeat(23))).toBe(false);
        expect(isToken("!".repeat(22))).toBe(false);
        expect(isToken("")).toBe(false);
    });
});
