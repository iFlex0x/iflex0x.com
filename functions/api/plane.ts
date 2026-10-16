interface Z_Env {
    Z_LISTEN: KVNamespace;
}

const Z_Ua = "iflex0x.com (+https://iflex0x.com)";

async function Z_Lookup(Z_Hex: string) {
    try {
        const Z_Pr = await fetch(`https://api.planespotters.net/pub/photos/hex/${Z_Hex}`, {
            headers: { "User-Agent": Z_Ua },
        });
        if (!Z_Pr.ok) return null;
        const Z_P = ((await Z_Pr.json()) as any)?.photos?.[0];
        const Z_Src = Z_P?.thumbnail_large?.src ?? Z_P?.thumbnail?.src;
        if (!Z_Src) return null;
        return { src: Z_Src, link: Z_P.link, by: Z_P.photographer };
    } catch {
        return null;
    }
}

export const onRequest: PagesFunction<Z_Env> = async (Z_Ctx) => {
    const Z_Heads = { "Cache-Control": "public, s-maxage=3600" };
    const Z_Day = new Date().toISOString().slice(0, 10);
    const Z_Key = "plane-" + Z_Day;
    const Z_Hit = await Z_Ctx.env.Z_LISTEN.get(Z_Key, "json");
    if (Z_Hit) {
        return Response.json(Z_Hit, { headers: Z_Heads });
    }
    try {
        const Z_Os = await fetch("https://opensky-network.org/api/states/all", {
            headers: { "User-Agent": Z_Ua },
        });
        if (Z_Os.ok) {
            const Z_St = ((await Z_Os.json()) as any)?.states ?? [];
            for (let Z_K = 0; Z_K < 10 && Z_St.length > 0; Z_K++) {
                const Z_S = Z_St[Math.floor(Math.random() * Z_St.length)];
                const Z_Hex = (Z_S?.[0] ?? "").trim();
                if (!Z_Hex) continue;
                const Z_Photo = await Z_Lookup(Z_Hex);
                if (!Z_Photo) continue;
                const Z_Plane = {
                    flight: (Z_S?.[1] ?? "").trim(),
                    reg: "",
                    type: "",
                    desc: "",
                    op: Z_S?.[2] ?? "",
                    photo: Z_Photo,
                    day: Z_Day,
                };
                await Z_Ctx.env.Z_LISTEN.put(Z_Key, JSON.stringify(Z_Plane));
                return Response.json(Z_Plane, { headers: Z_Heads });
            }
        }
    } catch {
    }
    return Response.json({}, { headers: Z_Heads });
};
