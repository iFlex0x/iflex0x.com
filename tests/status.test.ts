import { describe, expect, it } from "vitest";
import { linkState, shownStatus } from "../functions/_lib/status";

describe("linkState", () => {
    it("revoked beats expired", () => {
        expect(
            linkState(
                { expires_on: "2026-11-02", revoked_at: "2026-11-03T00:00:00Z" },
                "2026-11-03",
            ),
        ).toBe("revoked");
    });

    it("expires before today", () => {
        expect(linkState({ expires_on: "2026-11-02", revoked_at: null }, "2026-11-03")).toBe(
            "expired",
        );
        expect(linkState({ expires_on: "2026-11-03", revoked_at: null }, "2026-11-03")).toBe(
            "live",
        );
    });
});

describe("shownStatus", () => {
    it("paid beats overdue", () => {
        expect(shownStatus({ status: "paid", due_on: "2020-01-01" }, "2026-11-03")).toBe("paid");
    });

    it("void beats overdue", () => {
        expect(shownStatus({ status: "void", due_on: "2020-01-01" }, "2026-11-03")).toBe("void");
    });

    it("open is overdue only when due is before today", () => {
        expect(shownStatus({ status: "open", due_on: "2026-11-02" }, "2026-11-03")).toBe("overdue");
        expect(shownStatus({ status: "open", due_on: "2026-11-03" }, "2026-11-03")).toBe("due");
        expect(shownStatus({ status: "open", due_on: null }, "2026-11-03")).toBe("due");
    });
});
