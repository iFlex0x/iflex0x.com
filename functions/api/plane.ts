const Z_Fleet = [
    "82-8000",
    "92-9000",
    "UR-82060",
    "G-BOAC",
    "G-BOAF",
    "F-GSTA",
    "F-WWEA",
    "F-WXLR",
    "N905NA",
    "N780BA",
    "N787BA",
    "JA873A",
    "JA789A",
    "G-EUPJ",
    "9V-SKA",
    "VH-OQA",
    "D-ABYT",
    "PH-BVA",
    "A7-ANB",
    "TF-AAK",
];

const Z_Cache = (caches as unknown as { default: Cache }).default;

export const onRequest: PagesFunction = async (Z_Ctx) => {
    if (Z_Ctx.request.method === "GET") {
        const Z_Hit = await Z_Cache.match(Z_Ctx.request);
        if (Z_Hit) return Z_Hit;
    }
    const Z_Day = new Date().toISOString().slice(0, 10);
    const Z_Start = Math.floor(Date.parse(`${Z_Day}T00:00:00Z`) / 86400000);
    const Z_Res = Response.json(
        { reg: Z_Fleet[Z_Start % Z_Fleet.length], day: Z_Day },
        { headers: { "Cache-Control": "public, s-maxage=300" } },
    );
    if (Z_Ctx.request.method === "GET") {
        Z_Ctx.waitUntil(Z_Cache.put(Z_Ctx.request, Z_Res.clone()));
    }
    return Z_Res;
};
