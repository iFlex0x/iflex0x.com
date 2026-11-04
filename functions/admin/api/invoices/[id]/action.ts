import { getById, updateAction } from "../../../../_lib/db";
import { nextState, type InvoiceAction } from "../../../../_lib/actions";
import { readJson } from "../../../../_lib/request";
import { generateToken } from "../../../../_lib/token";
import { todayIso } from "../../../../_lib/dates";
import { CONFIG } from "../../../../_lib/config";
import { jsonResponse, textResponse } from "../../../../_lib/http";
import type { Env } from "../../../../_lib/types";

const ACTIONS: InvoiceAction[] = ["paid", "open", "void", "restore", "extend", "rotate", "revoke", "unrevoke"];

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
    const id = ctx.params.id;
    if (typeof id !== "string") return jsonResponse({ error: "not found" }, 404);

    const raw = await readJson(ctx.request, 4096);
    if (!raw.ok) return raw.response;

    const action =
        typeof raw.value === "object" && raw.value !== null ? (raw.value as { action?: unknown }).action : null;
    if (typeof action !== "string" || !ACTIONS.includes(action as InvoiceAction)) {
        return jsonResponse({ error: "invalid action" }, 400);
    }

    const row = await getById(ctx.env.INVOICES_DB, id);
    if (!row) return jsonResponse({ error: "not found" }, 404);

    const token = action === "rotate" ? generateToken() : undefined;
    const next = nextState(row, action as InvoiceAction, todayIso(), new Date().toISOString(), token);
    if (!next) return jsonResponse({ error: "invalid transition" }, 400);

    try {
        const updated = await updateAction(ctx.env.INVOICES_DB, id, {
            ...next,
            updatedAt: new Date().toISOString(),
        });
        if (!updated) return jsonResponse({ error: "update failed" }, 409);

        return jsonResponse(
            action === "rotate" && token ? { ok: true, url: `${CONFIG.invoiceUrl}/i/${token}` } : { ok: true },
        );
    } catch {
        console.error("invoice action failed", { number: row.number, code: "action" });
        return jsonResponse({ error: "action failed" }, 500);
    }
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "POST" });