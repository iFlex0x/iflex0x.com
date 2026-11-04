import { getById } from "../../_lib/db";
import { renderAdminDetail } from "../../_lib/admin-page";
import { notFoundPage } from "../../_lib/layout";
import { htmlResponse, makeNonce, textResponse } from "../../_lib/http";
import { todayIso } from "../../_lib/dates";
import type { AdminData, Env } from "../../_lib/types";

export const onRequestGet: PagesFunction<Env, string, AdminData> = async (ctx) => {
    const id = ctx.params.id;
    const row = typeof id === "string" ? await getById(ctx.env.INVOICES_DB, id) : null;
    if (!row) return notFoundPage();

    const nonce = makeNonce();
    const html = renderAdminDetail(row, { nonce, today: todayIso(), email: ctx.data.email });

    return htmlResponse(html, { kind: "admin", nonce });
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "GET" });