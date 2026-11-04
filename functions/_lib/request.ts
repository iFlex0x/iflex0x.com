import { jsonResponse } from "./http";

export type JsonBody = { ok: true; value: unknown } | { ok: false; response: Response };

export async function readJson(request: Request, maxBytes: number): Promise<JsonBody> {
    const length = Number(request.headers.get("Content-Length") ?? "0");
    if (length > maxBytes) return { ok: false, response: jsonResponse({ error: "body too large" }, 413) };

    const text = await request.text();
    if (text.length > maxBytes) return { ok: false, response: jsonResponse({ error: "body too large" }, 413) };

    try {
        return { ok: true, value: JSON.parse(text) };
    } catch {
        return { ok: false, response: jsonResponse({ error: "invalid json" }, 400) };
    }
}
