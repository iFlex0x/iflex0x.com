import { jsonResponse } from "./http";

export type JsonBody = { ok: true; value: unknown } | { ok: false; response: Response };

export async function readJson(request: Request, maxBytes: number): Promise<JsonBody> {
    const text = await request.text();

    if (new TextEncoder().encode(text).length > maxBytes) {
        return { ok: false, response: jsonResponse({ error: "body too large" }, 413) };
    }

    try {
        return { ok: true, value: JSON.parse(text) };
    } catch {
        return { ok: false, response: jsonResponse({ error: "invalid json" }, 400) };
    }
}