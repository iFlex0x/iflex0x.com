import { nextNumber } from "../_lib/db";
import { renderAdminNew } from "../_lib/admin-page";
import { htmlResponse, makeNonce, textResponse } from "../_lib/http";
import { todayIso } from "../_lib/dates";
import type { Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
    const defaultNumber = await nextNumber(ctx.env.INVOICES_DB, todayIso());
    const nonce = makeNonce();
    const html = renderAdminNew({ nonce, defaultNumber });

    return htmlResponse(html, { kind: "admin", nonce });
};

export const onRequest: PagesFunction<Env> = async () =>
    textResponse("method not allowed", 405, { Allow: "GET" });
