import { getByToken } from "../_lib/db";
import { isToken } from "../_lib/token";
import { linkState } from "../_lib/status";
import { todayIso } from "../_lib/dates";
import { renderInvoicePage } from "../_lib/invoice-page";
import { gonePage, notFoundPage, serverErrorPage } from "../_lib/layout";
import { htmlResponse, makeNonce, textResponse } from "../_lib/http";
import type { Env } from "../_lib/types";

export const onRequest: PagesFunction<Env> = async (ctx) => {
    if (ctx.request.method !== "GET" && ctx.request.method !== "HEAD") {
        return textResponse("method not allowed", 405, { Allow: "GET, HEAD" });
    }

    const token = String(ctx.params.token);
    if (!isToken(token)) return notFoundPage();

    try {
        const row = await getByToken(ctx.env.INVOICES_DB, token);
        if (!row) return notFoundPage();

        const today = todayIso();
        if (linkState(row, today) !== "live") return gonePage();

        const nonce = makeNonce();
        const html = renderInvoicePage(row, { nonce, today });
        return htmlResponse(html, { kind: "invoice", nonce, head: ctx.request.method === "HEAD" });
    } catch (error) {
        console.error("invoice render failed", error);
        return serverErrorPage();
    }
};