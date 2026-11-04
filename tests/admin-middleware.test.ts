import { describe, expect, it } from "vitest";
import { onRequest } from "../functions/admin/_middleware";
import { CONFIG } from "../functions/_lib/config";
import type { AdminData, Env } from "../functions/_lib/types";

const dev = {
    INVOICES_DB: {} as D1Database,
    Z_LISTEN: {} as KVNamespace,
    ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
    ACCESS_AUD: "aud",
    ADMIN_EMAIL: CONFIG.email,
    ENVIRONMENT: "dev",
    DEV_BYPASS_ACCESS: "1",
} as Env;

type Ctx = EventContext<Env, string, AdminData>;

function context(
    path: string,
    opts: { method?: string; headers?: Record<string, string>; env?: Env } = {},
): Ctx {
    const request = new Request(`http://localhost${path}`, {
        method: opts.method ?? "GET",
        headers: opts.headers ?? {},
    });
    return {
        request,
        env: opts.env ?? dev,
        params: {},
        data: { email: "" },
        next: async () => new Response("next", { status: 200 }),
        waitUntil: () => {},
        passThroughOnException: () => {},
    } as unknown as Ctx;
}

const write = {
    Origin: "http://localhost",
    "Sec-Fetch-Site": "same-origin",
    "X-Admin-Request": "1",
    "Content-Type": "application/json",
};

describe("admin middleware", () => {
    it("returns a json 403 for an unauthenticated api call", async () => {
        const res = await onRequest(
            context("/admin/api/invoices", { env: { ...dev, ENVIRONMENT: "production" } }),
        );
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ error: "forbidden" });
    });

    it("returns the html error page for an unauthenticated page", async () => {
        const res = await onRequest(
            context("/admin", { env: { ...dev, ENVIRONMENT: "production" } }),
        );
        expect(res.status).toBe(403);
        expect(res.headers.get("content-type")).toContain("text/html");
    });

    it("names the csrf failure instead of claiming the session expired", async () => {
        const res = await onRequest(
            context("/admin/api/invoices", { method: "POST", headers: {} }),
        );
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ error: "origin mismatch" });
    });

    it("rejects a write without the custom header", async () => {
        const res = await onRequest(
            context("/admin/api/invoices", {
                method: "POST",
                headers: {
                    Origin: "http://localhost",
                    "Sec-Fetch-Site": "same-origin",
                    "Content-Type": "application/json",
                },
            }),
        );
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ error: "missing admin header" });
    });

    it("passes a same-origin write through", async () => {
        const res = await onRequest(
            context("/admin/api/invoices", { method: "POST", headers: write }),
        );
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("next");
    });

    it("passes read-only admin pages through", async () => {
        const res = await onRequest(context("/admin"));
        expect(res.status).toBe(200);
    });
});
