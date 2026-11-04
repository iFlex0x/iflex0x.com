import { getById, updateInvoice } from "../../../_lib/db";
import { parseInvoicePayload, MAX_BODY_BYTES } from "../../../_lib/validate";
import { readJson } from "../../../_lib/request";
import { jsonResponse, textResponse } from "../../../_lib/http";
import type { Env } from "../../../_lib/types";

function isUniqueNumberError(error: unknown): boolean {
    return String(error).includes("UNIQUE constraint failed: invoices.number");
}

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
    const id = ctx.params.id;
    if (typeof id !== "string") return jsonResponse({ error: "not found" }, 404);

    const raw = await readJson(ctx.request, MAX_BODY_BYTES);
    if (!raw.ok) return raw.response;

    const parsed = parseInvoicePayload(raw.value);
    if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);

    try {
        const updated = await updateInvoice(ctx.env.INVOICES_DB, id, {
            number: parsed.value.number,
            clientName: parsed.value.clientName,
            clientSub: parsed.value.clientSub,
            clientLines: JSON.stringify(parsed.value.clientLines),
            issuedOn: parsed.value.issuedOn,
            dueOn: parsed.value.dueOn,
            body: JSON.stringify(parsed.value.body),
            totalCents: parsed.value.totals.totalCents,
            updatedAt: new Date().toISOString(),
        });

        if (!updated) {
            const row = await getById(ctx.env.INVOICES_DB, id);
            if (!row) return jsonResponse({ error: "not found" }, 404);
            return jsonResponse({ error: "invoice is not open" }, 409);
        }

        return jsonResponse({ ok: true, id });
    } catch (error) {
        if (isUniqueNumberError(error)) return jsonResponse({ error: "number already used" }, 409);
        console.error("invoice update failed", { number: parsed.value.number, code: "update" });
        return jsonResponse({ error: "update failed" }, 500);
    }
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "PUT" });