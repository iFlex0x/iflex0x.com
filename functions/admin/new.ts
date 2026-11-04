import { nextNumber } from "../_lib/db";
import { renderAdminNew } from "../_lib/admin-page";
import { htmlResponse, makeNonce, textResponse } from "../_lib/http";
import { todayIso } from "../_lib/dates";
import type { Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
    const today = todayIso();
    const defaultNumber = await nextNumber(ctx.env.INVOICES_DB, today);
    const nonce = makeNonce();
    const html = renderAdminNew({ nonce, today, defaultNumber });

    return htmlResponse(html, { kind: "admin", nonce });
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "GET" });