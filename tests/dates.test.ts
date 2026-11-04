import { describe, expect, it } from "vitest";
import {
    addDaysIso,
    formatDisplayDate,
    isExpired,
    isOverdue,
    todayIso,
} from "../functions/_lib/dates";

describe("todayIso", () => {
    it("uses Copenhagen, not UTC", () => {
        expect(todayIso(new Date("2026-11-03T22:30:00Z"))).toBe("2026-11-03");
        expect(todayIso(new Date("2026-11-03T23:30:00Z"))).toBe("2026-11-04");
    });

    it("holds across the spring DST change", () => {
        expect(todayIso(new Date("2026-03-29T00:30:00Z"))).toBe("2026-03-29");
        expect(todayIso(new Date("2026-03-29T01:30:00Z"))).toBe("2026-03-29");
        expect(todayIso(new Date("2026-03-29T22:30:00Z"))).toBe("2026-03-30");
    });
});

describe("addDaysIso", () => {
    it("adds 90 days", () => {
        expect(addDaysIso("2026-11-03", 90)).toBe("2027-02-01");
    });

    it("handles leap years", () => {
        expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29");
        expect(addDaysIso("2028-02-28", 2)).toBe("2028-03-01");
    });
});

describe("display and comparisons", () => {
    it("formats dates for the page", () => {
        expect(formatDisplayDate("2026-11-03")).toBe("03 NOV 2026");
    });

    it("treats the expiry day as still live", () => {
        expect(isExpired("2026-11-02", "2026-11-03")).toBe(true);
        expect(isExpired("2026-11-03", "2026-11-03")).toBe(false);
    });

    it("treats the due day as not overdue", () => {
        expect(isOverdue("2026-11-02", "2026-11-03")).toBe(true);
        expect(isOverdue("2026-11-03", "2026-11-03")).toBe(false);
        expect(isOverdue(null, "2026-11-03")).toBe(false);
    });
});
