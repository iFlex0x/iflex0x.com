import { getById, updateAction } from "../../../../_lib/db";
import { ACTIONS, nextState, type InvoiceAction } from "../../../../_lib/actions";
import { readJson } from "../../../../_lib/request";
import { generateToken } from "../../../../_lib/token";
import { todayIso } from "../../../../_lib/dates";
import { INVOICE_URL } from "../../../../_lib/config";
import { jsonResponse, textResponse } from "../../../../_lib/http";
import type { Env } from "../../../../_lib/types";

function isAction(value: unknown): value is InvoiceAction {
    return typeof value === "string" && ACTIONS.some((action) => action === value);
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
    const id = String(ctx.params.id);

    const raw = await readJson(ctx.request, 4096);
    if (!raw.ok) return raw.response;

    const action =
        typeof raw.value === "object" && raw.value !== null
            ? (raw.value as { action?: unknown }).action
            : null;
    if (!isAction(action)) return jsonResponse({ error: "invalid action" }, 400);

    const row = await getById(ctx.env.INVOICES_DB, id);
    if (!row) return jsonResponse({ error: "not found" }, 404);

    const token = action === "rotate" ? generateToken() : undefined;
    const next = nextState(row, action, todayIso(), new Date().toISOString(), token);
    if (!next) return jsonResponse({ error: "invalid transition" }, 400);

    try {
        const updated = await updateAction(
            ctx.env.INVOICES_DB,
            id,
            { ...next, updated_at: new Date().toISOString() },
            { status: row.status, updated_at: row.updated_at },
        );
        if (!updated) return jsonResponse({ error: "invoice changed, reload" }, 409);

        return jsonResponse(
            action === "rotate" && token
                ? { ok: true, url: `${INVOICE_URL}/i/${token}` }
                : { ok: true },
        );
    } catch (error) {
        console.error("invoice action failed", error);
        return jsonResponse({ error: "action failed" }, 500);
    }
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "POST" });
