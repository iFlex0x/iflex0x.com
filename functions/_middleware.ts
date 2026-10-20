export const onRequest: PagesFunction = async (Z_Ctx) => {
    const Z_Url = new URL(Z_Ctx.request.url);
    if (Z_Url.hostname.endsWith(".pages.dev")) {
        return Response.redirect(`https://iflex0x.com${Z_Url.pathname}${Z_Url.search}`, 301);
    }
    return Z_Ctx.next();
};
