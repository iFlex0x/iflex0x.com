import { describe, expect, it } from "vitest";
import { verifyAccess } from "../functions/_lib/access";
import type { Env } from "../functions/_lib/types";

const base = {
    INVOICES_DB: {} as D1Database,
    ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
    ACCESS_AUD: "aud",
    ADMIN_EMAIL: "ad@iflex0x.com",
    ENVIRONMENT: "dev",
    DEV_BYPASS_ACCESS: "1",
} as Env;

describe("verifyAccess", () => {
    it("allows the dev bypass on localhost", async () => {
        const result = await verifyAccess(new Request("http://localhost/admin"), base);
        expect(result).toEqual({ ok: true, email: "ad@iflex0x.com" });
    });

    it("does not bypass 127.0.0.1", async () => {
        const result = await verifyAccess(new Request("http://127.0.0.1/admin"), base);
        expect(result).toEqual({ ok: false, status: 403 });
    });

    it("does not bypass production", async () => {
        const result = await verifyAccess(new Request("http://localhost/admin"), {
            ...base,
            ENVIRONMENT: "production",
        });
        expect(result).toEqual({ ok: false, status: 403 });
    });

    it("rejects a missing JWT", async () => {
        const result = await verifyAccess(new Request("http://localhost/admin"), {
            ...base,
            DEV_BYPASS_ACCESS: "0",
        });
        expect(result).toEqual({ ok: false, status: 403 });
    });
});