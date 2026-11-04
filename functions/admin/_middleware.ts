import { verifyAccess } from "../_lib/access";
import { checkCsrf } from "../_lib/csrf";
import { CONFIG } from "../_lib/config";
import { jsonResponse } from "../_lib/http";
import { forbiddenPage, unavailablePage } from "../_lib/layout";
import type { AdminData, Env } from "../_lib/types";

function adminError(request: Request, status: 403 | 503): Response {
    if (new URL(request.url).pathname.startsWith("/admin/api/")) {
        const response = jsonResponse({ error: status === 403 ? "forbidden" : "unavailable" }, status);
        if (status === 503) response.headers.set("Retry-After", "30");
        return response;
    }
    return status === 403 ? forbiddenPage() : unavailablePage();
}

export const onRequest: PagesFunction<Env, string, AdminData> = async (ctx) => {
    const access = await verifyAccess(ctx.request, ctx.env);
    if (!access.ok) return adminError(ctx.request, access.status);

    ctx.data.email = access.email;

    const url = new URL(ctx.request.url);
    const expected =
        ctx.env.ENVIRONMENT === "dev" && url.hostname === "localhost" ? url.origin : CONFIG.invoiceUrl;
    const csrf = checkCsrf(ctx.request, expected);
    if (!csrf.ok) return adminError(ctx.request, 403);

    return ctx.next();
};