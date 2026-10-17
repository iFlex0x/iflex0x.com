interface Z_Env {
    Z_LISTEN: KVNamespace;
}

interface Z_Lanyard {
    listening_to_spotify?: boolean;
    spotify?: {
        song?: string;
        artist?: string;
        album_art_url?: string;
        track_id?: string;
    };
}

interface Z_Stored {
    song: string;
    artist: string;
    art: string;
    id: string;
    t: number;
}

const Z_Cache = (caches as unknown as { default: Cache }).default;

export const onRequest: PagesFunction<Z_Env> = async (Z_Ctx) => {
    if (Z_Ctx.request.method === "GET") {
        const Z_Hit = await Z_Cache.match(Z_Ctx.request);
        if (Z_Hit) return Z_Hit;
    }
    const Z_Res = await Z_Track(Z_Ctx);
    if (Z_Ctx.request.method === "GET") {
        Z_Ctx.waitUntil(Z_Cache.put(Z_Ctx.request, Z_Res.clone()));
    }
    return Z_Res;
};

async function Z_Track(Z_Ctx: EventContext<Z_Env, string, unknown>) {
    const Z_Heads = { "Cache-Control": "public, s-maxage=15" };
    const Z_LiveKey = "live";
    const Z_LastKey = "last";
    let Z_Seen = false;
    try {
        const Z_Res = await fetch("https://api.lanyard.rest/v1/users/1007939118925361212");
        if (Z_Res.ok) {
            Z_Seen = true;
            const Z_Body = (await Z_Res.json()) as { data?: Z_Lanyard };
            const Z_Sp = Z_Body?.data?.spotify;
            if (Z_Body?.data?.listening_to_spotify && Z_Sp) {
                const Z_TrackVal: Z_Stored = {
                    song: Z_Sp.song ?? "",
                    artist: Z_Sp.artist ?? "",
                    art: Z_Sp.album_art_url ?? "",
                    id: Z_Sp.track_id ?? "",
                    t: Date.now(),
                };
                const Z_Prev = await Z_Ctx.env.Z_LISTEN.get<Z_Stored>(Z_LiveKey, "json");
                if (Z_Prev?.id !== Z_TrackVal.id) {
                    await Z_Ctx.env.Z_LISTEN.put(Z_LiveKey, JSON.stringify(Z_TrackVal));
                }
                return Response.json(
                    { ...Z_TrackVal, live: true },
                    {
                        headers: Z_Heads,
                    },
                );
            }
        }
    } catch (Z_E) {
        console.warn("listening: lanyard failed", Z_E);
    }
    if (Z_Seen) {
        const Z_Was = await Z_Ctx.env.Z_LISTEN.get<Z_Stored>(Z_LiveKey, "json");
        if (Z_Was?.song) {
            const Z_Frozen = { ...Z_Was, t: Date.now() };
            await Z_Ctx.env.Z_LISTEN.put(Z_LastKey, JSON.stringify(Z_Frozen));
            await Z_Ctx.env.Z_LISTEN.delete(Z_LiveKey);
            return Response.json(
                { ...Z_Frozen, live: false },
                {
                    headers: Z_Heads,
                },
            );
        }
    }
    const Z_Last = await Z_Ctx.env.Z_LISTEN.get<Z_Stored>(Z_LastKey, "json");
    return Response.json(
        { ...(Z_Last ?? {}), live: false },
        {
            headers: Z_Heads,
        },
    );
}
