interface Z_Env {
    Z_LISTEN: KVNamespace;
}

export const onRequest: PagesFunction<Z_Env> = async (Z_Ctx) => {
    const Z_LiveKey = "live";
    const Z_LastKey = "last";
    let Z_Seen = false;
    try {
        const Z_Res = await fetch(
            "https://api.lanyard.rest/v1/users/1007939118925361212",
        );
        if (Z_Res.ok) {
            Z_Seen = true;
            const Z_Body = (await Z_Res.json()) as any;
            const Z_Sp = Z_Body?.data?.spotify;
            if (Z_Body?.data?.listening_to_spotify && Z_Sp) {
                const Z_Track = {
                    song: Z_Sp.song,
                    artist: Z_Sp.artist,
                    art: Z_Sp.album_art_url,
                    id: Z_Sp.track_id,
                    t: Date.now(),
                };
                await Z_Ctx.env.Z_LISTEN.put(Z_LiveKey, JSON.stringify(Z_Track));
                return Response.json({ ...Z_Track, live: true });
            }
        }
    } catch {
        /* fall through to cache */
    }
    if (Z_Seen) {
        const Z_Was = await Z_Ctx.env.Z_LISTEN.get(Z_LiveKey, "json");
        if (Z_Was && (Z_Was as any).song) {
            const Z_Frozen = { ...(Z_Was as any), t: Date.now() };
            await Z_Ctx.env.Z_LISTEN.put(Z_LastKey, JSON.stringify(Z_Frozen));
            await Z_Ctx.env.Z_LISTEN.delete(Z_LiveKey);
            return Response.json({ ...Z_Frozen, live: false });
        }
    }
    const Z_Last = await Z_Ctx.env.Z_LISTEN.get(Z_LastKey, "json");
    return Response.json({ ...((Z_Last as any) ?? {}), live: false });
};
