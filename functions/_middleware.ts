import { decideRoute } from "./_lib/routing";
import { notFoundPage, robotsResponse } from "./_lib/layout";
import type { Env } from "./_lib/types";

export const onRequest: PagesFunction<Env> = async (ctx) => {
    const url = new URL(ctx.request.url);
    const route = decideRoute(url.hostname, url.pathname);

    if (route.kind === "robots") return robotsResponse();
    if (route.kind === "not-found") return notFoundPage();
    if (route.kind === "redirect") {
        return Response.redirect(`https://${route.host}${url.pathname}${url.search}`, 302);
    }

    return ctx.next();
};
