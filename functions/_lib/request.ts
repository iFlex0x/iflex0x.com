import { jsonResponse } from "./http";

export type JsonBody = { ok: true; value: unknown } | { ok: false; response: Response };

export async function readJson(request: Request, maxBytes: number): Promise<JsonBody> {
    const length = Number(request.headers.get("Content-Length") ?? "0");
    if (length > maxBytes)
        return { ok: false, response: jsonResponse({ error: "body too large" }, 413) };

    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    if (reader) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel();
                return { ok: false, response: jsonResponse({ error: "body too large" }, 413) };
            }
            chunks.push(value);
        }
    }

    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
    }

    try {
        return { ok: true, value: JSON.parse(new TextDecoder().decode(buffer)) };
    } catch {
        return { ok: false, response: jsonResponse({ error: "invalid json" }, 400) };
    }
}
