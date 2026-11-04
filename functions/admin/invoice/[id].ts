import { getById } from "../../_lib/db";
import { renderAdminDetail } from "../../_lib/admin-page";
import { notFoundPage, serverErrorPage } from "../../_lib/layout";
import { htmlResponse, makeNonce, textResponse } from "../../_lib/http";
import { todayIso } from "../../_lib/dates";
import type { AdminData, Env } from "../../_lib/types";

export const onRequestGet: PagesFunction<Env, string, AdminData> = async (ctx) => {
    try {
        const row = await getById(ctx.env.INVOICES_DB, String(ctx.params.id));
        if (!row) return notFoundPage();

        const nonce = makeNonce();
        const html = renderAdminDetail(row, { nonce, today: todayIso(), email: ctx.data.email });

        return htmlResponse(html, { kind: "admin", nonce });
    } catch (error) {
        console.error("admin detail failed", error);
        return serverErrorPage();
    }
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "GET" });
