import { getById, isUniqueNumberError, updateInvoice } from "../../../_lib/db";
import { parseInvoicePayload, MAX_BODY_BYTES } from "../../../_lib/validate";
import { readJson } from "../../../_lib/request";
import { jsonResponse, textResponse } from "../../../_lib/http";
import type { Env } from "../../../_lib/types";

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
    const id = String(ctx.params.id);

    const raw = await readJson(ctx.request, MAX_BODY_BYTES);
    if (!raw.ok) return raw.response;

    const parsed = parseInvoicePayload(raw.value);
    if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);

    const current = await getById(ctx.env.INVOICES_DB, id);
    if (!current) return jsonResponse({ error: "not found" }, 404);
    if (current.status !== "open") return jsonResponse({ error: "invoice is not open" }, 409);

    try {
        const updated = await updateInvoice(
            ctx.env.INVOICES_DB,
            id,
            {
                number: parsed.value.number,
                client_name: parsed.value.clientName,
                client_sub: parsed.value.clientSub,
                client_lines: JSON.stringify(parsed.value.clientLines),
                issued_on: parsed.value.issuedOn,
                due_on: parsed.value.dueOn,
                body: JSON.stringify(parsed.value.body),
                subtotal_cents: parsed.value.totals.subtotalCents,
                discount_cents: parsed.value.totals.discountCents,
                tax_cents: parsed.value.totals.taxCents,
                total_cents: parsed.value.totals.totalCents,
                updated_at: new Date().toISOString(),
            },
            current.updated_at,
        );
        if (!updated) return jsonResponse({ error: "invoice changed, reload" }, 409);
        return jsonResponse({ ok: true, id });
    } catch (error) {
        if (isUniqueNumberError(error)) return jsonResponse({ error: "number already used" }, 409);
        console.error("invoice update failed", error);
        return jsonResponse({ error: "update failed" }, 500);
    }
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "PUT" });
