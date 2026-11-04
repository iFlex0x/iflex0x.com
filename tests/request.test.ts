import { describe, expect, it } from "vitest";
import { readJson } from "../functions/_lib/request";

function req(body: string): Request {
    return new Request("https://invoice.iflex0x.com/admin/api/invoices", { method: "POST", body });
}

describe("readJson", () => {
    it("parses valid JSON", async () => {
        const result = await readJson(req('{"a":1}'), 1024);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toEqual({ a: 1 });
    });

    it("rejects invalid JSON with 400", async () => {
        const result = await readJson(req("{"), 1024);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.response.status).toBe(400);
    });

    it("rejects an oversized body with 413", async () => {
        const result = await readJson(req("x".repeat(1025)), 1024);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.response.status).toBe(413);
    });

    it("counts bytes, not characters", async () => {
        const result = await readJson(req("é".repeat(600)), 1024);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.response.status).toBe(413);
    });
});
