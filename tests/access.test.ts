import { beforeAll, describe, expect, it, vi } from "vitest";
import { SignJWT, exportJWK, generateKeyPair, type JWK } from "jose";
import type { Env } from "../functions/_lib/types";
import { CONFIG } from "../functions/_lib/config";

const jwksState = vi.hoisted(() => ({ keys: [] as JWK[] }));

vi.mock("jose", async (importOriginal) => {
    const actual = await importOriginal<typeof import("jose")>();
    return {
        ...actual,
        createRemoteJWKSet: () => actual.createLocalJWKSet({ keys: jwksState.keys }),
    };
});

import { verifyAccess } from "../functions/_lib/access";

const team = "https://team.cloudflareaccess.com";

const base = {
    INVOICES_DB: {} as D1Database,
    Z_LISTEN: {} as KVNamespace,
    ACCESS_TEAM_DOMAIN: team,
    ACCESS_AUD: "aud",
    ADMIN_EMAIL: CONFIG.email,
    ENVIRONMENT: "production",
} as Env;

let key: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];

beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    key = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    jwksState.keys.push({ ...jwk, alg: "RS256", use: "sig", kid: "test" });
});

function sign(
    overrides: {
        email?: string | null;
        audience?: string;
        issuer?: string;
        expired?: boolean;
    } = {},
) {
    const claims = overrides.email === null ? {} : { email: overrides.email ?? "AD@iflex0x.com" };
    return new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setIssuedAt()
        .setIssuer(overrides.issuer ?? team)
        .setAudience(overrides.audience ?? "aud")
        .setExpirationTime(overrides.expired ? Math.floor(Date.now() / 1000) - 60 : "1h")
        .sign(key);
}

function request(token?: string): Request {
    const headers: Record<string, string> = token ? { "Cf-Access-Jwt-Assertion": token } : {};
    return new Request("https://invoice.iflex0x.com/admin", { headers });
}

describe("verifyAccess", () => {
    it("accepts a valid assertion and lowercases the email", async () => {
        const result = await verifyAccess(request(await sign()), base);
        expect(result).toEqual({ ok: true, email: CONFIG.email });
    });

    it("rejects a wrong audience", async () => {
        const result = await verifyAccess(request(await sign({ audience: "other" })), base);
        expect(result).toEqual({ ok: false, status: 403 });
    });

    it("rejects a wrong issuer", async () => {
        const result = await verifyAccess(
            request(await sign({ issuer: "https://evil.example" })),
            base,
        );
        expect(result).toEqual({ ok: false, status: 403 });
    });

    it("rejects a wrong email", async () => {
        const result = await verifyAccess(
            request(await sign({ email: "someone@example.com" })),
            base,
        );
        expect(result).toEqual({ ok: false, status: 403 });
    });

    it("rejects a missing or non-string email", async () => {
        expect(await verifyAccess(request(await sign({ email: null })), base)).toEqual({
            ok: false,
            status: 403,
        });
        expect(await verifyAccess(request(await sign({ email: "42" })), base)).toEqual({
            ok: false,
            status: 403,
        });
    });

    it("rejects an expired assertion", async () => {
        const result = await verifyAccess(request(await sign({ expired: true })), base);
        expect(result).toEqual({ ok: false, status: 403 });
    });

    it("rejects a missing JWT", async () => {
        expect(await verifyAccess(request(), base)).toEqual({ ok: false, status: 403 });
    });

    it("returns unavailable when Access is not configured", async () => {
        const result = await verifyAccess(request(await sign()), {
            ...base,
            ACCESS_TEAM_DOMAIN: "",
        });
        expect(result).toEqual({ ok: false, status: 503 });
    });
});

describe("dev bypass", () => {
    const dev = { ...base, ENVIRONMENT: "dev", DEV_BYPASS_ACCESS: "1" };

    it("allows localhost", async () => {
        const result = await verifyAccess(new Request("http://localhost/admin"), dev);
        expect(result).toEqual({ ok: true, email: CONFIG.email });
    });

    it("does not bypass 127.0.0.1", async () => {
        const result = await verifyAccess(new Request("http://127.0.0.1/admin"), dev);
        expect(result).toEqual({ ok: false, status: 403 });
    });

    it("does not bypass production", async () => {
        const result = await verifyAccess(new Request("http://localhost/admin"), {
            ...dev,
            ENVIRONMENT: "production",
        });
        expect(result).toEqual({ ok: false, status: 403 });
    });

    it("does not bypass when the flag is missing", async () => {
        const result = await verifyAccess(new Request("http://localhost/admin"), {
            ...dev,
            DEV_BYPASS_ACCESS: "0",
        });
        expect(result).toEqual({ ok: false, status: 403 });
    });
});
