import { verifyAccess } from "../_lib/access";
import { checkCsrf } from "../_lib/csrf";
import { INVOICE_URL } from "../_lib/config";
import { jsonResponse } from "../_lib/http";
import { forbiddenPage, unavailablePage } from "../_lib/layout";
import type { AdminData, Env } from "../_lib/types";

function isApi(request: Request): boolean {
    return new URL(request.url).pathname.startsWith("/admin/api/");
}

function accessError(request: Request, status: 403 | 503): Response {
    if (isApi(request)) {
        const response = jsonResponse(
            { error: status === 403 ? "forbidden" : "unavailable" },
            status,
        );
        if (status === 503) response.headers.set("Retry-After", "30");
        return response;
    }
    return status === 403 ? forbiddenPage() : unavailablePage();
}

export const onRequest: PagesFunction<Env, string, AdminData> = async (ctx) => {
    const access = await verifyAccess(ctx.request, ctx.env);
    if (!access.ok) return accessError(ctx.request, access.status);

    ctx.data.email = access.email;

    const url = new URL(ctx.request.url);
    const local = ctx.env.ENVIRONMENT === "dev" && url.hostname === "localhost";
    const csrf = checkCsrf(ctx.request, local ? url.origin : INVOICE_URL);
    if (!csrf.ok) {
        if (isApi(ctx.request)) return jsonResponse({ error: csrf.error }, 403);
        return forbiddenPage();
    }

    return ctx.next();
};
