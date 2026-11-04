import { insertInvoice, isUniqueNumberError } from "../../../_lib/db";
import { parseInvoicePayload, MAX_BODY_BYTES } from "../../../_lib/validate";
import { readJson } from "../../../_lib/request";
import { generateToken } from "../../../_lib/token";
import { addDaysIso, todayIso } from "../../../_lib/dates";
import { CONFIG, INVOICE_URL } from "../../../_lib/config";
import { jsonResponse, textResponse } from "../../../_lib/http";
import type { Env } from "../../../_lib/types";

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
    const raw = await readJson(ctx.request, MAX_BODY_BYTES);
    if (!raw.ok) return raw.response;

    const parsed = parseInvoicePayload(raw.value);
    if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);

    const id = crypto.randomUUID();
    const token = generateToken();
    const createdAt = new Date().toISOString();
    const expiresOn = addDaysIso(todayIso(), CONFIG.expiryDays);

    try {
        await insertInvoice(ctx.env.INVOICES_DB, {
            id,
            token,
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
            expires_on: expiresOn,
            created_at: createdAt,
        });
    } catch (error) {
        if (isUniqueNumberError(error)) return jsonResponse({ error: "number already used" }, 409);
        console.error("invoice create failed", error);
        return jsonResponse({ error: "create failed" }, 500);
    }

    return jsonResponse({ id, url: `${INVOICE_URL}/i/${token}`, number: parsed.value.number }, 201);
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "POST" });
