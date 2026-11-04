import { describe, expect, it } from "vitest";
import { availableActions, nextState } from "../functions/_lib/actions";
import { CONFIG } from "../functions/_lib/config";

const open = { status: "open" as const, paid_on: null, expires_on: "2026-12-01", revoked_at: null };
const paid = {
    status: "paid" as const,
    paid_on: "2026-11-01",
    expires_on: "2026-12-01",
    revoked_at: null,
};
const voided = {
    status: "void" as const,
    paid_on: null,
    expires_on: "2026-12-01",
    revoked_at: null,
};
const today = "2026-11-03";
const now = "2026-11-03T12:00:00.000Z";

describe("availableActions", () => {
    const names = (status: "open" | "paid" | "void", revoked: string | null) =>
        availableActions({ status, revoked_at: revoked }).map((button) => button.action);

    it("offers the transitions the state allows", () => {
        expect(names("open", null)).toEqual(["paid", "void", "extend", "rotate", "revoke"]);
        expect(names("paid", null)).toEqual(["open", "void", "extend", "rotate", "revoke"]);
        expect(names("void", null)).toEqual(["restore", "revoke"]);
        expect(names("open", "2026-11-03T00:00:00Z")).toEqual([
            "paid",
            "void",
            "extend",
            "rotate",
            "unrevoke",
        ]);
    });

    it("labels the extension with the configured window", () => {
        const extend = availableActions({ status: "open", revoked_at: null }).find(
            (button) => button.action === "extend",
        );
        expect(extend?.label).toBe(`extend ${CONFIG.expiryDays} days`);
    });
});

describe("nextState", () => {
    it("moves open to paid and back", () => {
        expect(nextState(open, "paid", today, now)).toMatchObject({
            status: "paid",
            paid_on: today,
        });
        expect(nextState(paid, "open", today, now)).toMatchObject({
            status: "open",
            paid_on: null,
        });
    });

    it("voids and restores", () => {
        expect(nextState(open, "void", today, now)).toMatchObject({ status: "void" });
        expect(nextState(paid, "void", today, now)).toMatchObject({ status: "void" });
        expect(nextState(voided, "restore", today, now)).toMatchObject({
            status: "open",
            paid_on: null,
        });
    });

    it("extends to the later date", () => {
        expect(nextState(open, "extend", today, now)?.expires_on).toBe("2027-02-01");
        expect(
            nextState({ ...open, expires_on: "2027-06-01" }, "extend", today, now)?.expires_on,
        ).toBe("2027-06-01");
    });

    it("rotates the token and clears revoke", () => {
        const next = nextState(
            { ...open, revoked_at: now },
            "rotate",
            today,
            now,
            "NEWTOKEN1234567890ABCD",
        );
        expect(next).toMatchObject({
            token: "NEWTOKEN1234567890ABCD",
            expires_on: "2027-02-01",
            revoked_at: null,
        });
    });

    it("revokes and unrevokes", () => {
        expect(nextState(paid, "revoke", today, now)?.revoked_at).toBe(now);
        expect(
            nextState({ ...open, revoked_at: now }, "unrevoke", today, now)?.revoked_at,
        ).toBeNull();
    });

    it("rejects invalid transitions and no-ops", () => {
        expect(nextState(paid, "paid", today, now)).toBeNull();
        expect(nextState(voided, "rotate", today, now)).toBeNull();
        expect(nextState(open, "restore", today, now)).toBeNull();
        expect(nextState(voided, "extend", today, now)).toBeNull();
        expect(nextState({ ...open, revoked_at: now }, "revoke", today, now)).toBeNull();
        expect(nextState(open, "unrevoke", today, now)).toBeNull();
    });
});
