import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import type { Env } from "./types";

export type AccessResult = { ok: true; email: string } | { ok: false; status: 403 | 503 };

type Jwks = ReturnType<typeof createRemoteJWKSet>;
let jwksCache: { url: string; jwks: Jwks } | null = null;

function getJwks(teamDomain: string): Jwks {
    const url = `${teamDomain}/cdn-cgi/access/certs`;
    if (!jwksCache || jwksCache.url !== url) {
        jwksCache = { url, jwks: createRemoteJWKSet(new URL(url)) };
    }
    return jwksCache.jwks;
}

export async function verifyAccess(request: Request, env: Env): Promise<AccessResult> {
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ADMIN_EMAIL)
        return { ok: false, status: 503 };

    const url = new URL(request.url);
    if (
        env.ENVIRONMENT === "dev" &&
        env.DEV_BYPASS_ACCESS === "1" &&
        url.hostname === "localhost"
    ) {
        return { ok: true, email: env.ADMIN_EMAIL };
    }

    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token) return { ok: false, status: 403 };

    const teamDomain = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, "");
    let jwks: Jwks;
    try {
        jwks = getJwks(teamDomain);
    } catch {
        return { ok: false, status: 503 };
    }

    try {
        const { payload } = await jwtVerify(token, jwks, {
            issuer: teamDomain,
            audience: env.ACCESS_AUD,
        });
        const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
        if (email !== env.ADMIN_EMAIL.toLowerCase()) return { ok: false, status: 403 };
        return { ok: true, email: env.ADMIN_EMAIL };
    } catch (error) {
        if (
            error instanceof errors.JWKSTimeout ||
            error instanceof errors.JWKSNoMatchingKey ||
            error instanceof errors.JWKSMultipleMatchingKeys ||
            error instanceof errors.JWKSInvalid
        ) {
            return { ok: false, status: 503 };
        }
        if (error instanceof errors.JOSEError) return { ok: false, status: 403 };
        console.warn("access: unexpected verify failure", error);
        return { ok: false, status: 503 };
    }
}
