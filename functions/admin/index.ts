import { listInvoices } from "../_lib/db";
import { renderAdminList } from "../_lib/admin-page";
import { htmlResponse, makeNonce, textResponse } from "../_lib/http";
import { serverErrorPage } from "../_lib/layout";
import { todayIso } from "../_lib/dates";
import type { AdminData, Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env, string, AdminData> = async (ctx) => {
    try {
        const rows = await listInvoices(ctx.env.INVOICES_DB);
        const nonce = makeNonce();
        const html = renderAdminList(rows, { nonce, today: todayIso(), email: ctx.data.email });

        return htmlResponse(html, { kind: "admin", nonce });
    } catch (error) {
        console.error("admin list failed", error);
        return serverErrorPage();
    }
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "GET" });
