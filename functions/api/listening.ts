interface Z_Env {
    Z_LISTEN: KVNamespace;
}

export const onRequest: PagesFunction<Z_Env> = async (Z_Ctx) => {
    const Z_Key = "last";
    try {
        const Z_Res = await fetch(
            "https://api.lanyard.rest/v1/users/1007939118925361212",
        );
        if (Z_Res.ok) {
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
                await Z_Ctx.env.Z_LISTEN.put(Z_Key, JSON.stringify(Z_Track));
                return Response.json({ ...Z_Track, live: true });
            }
        }
    } catch {
        /* fall through to cache */
    }
    const Z_Cached = await Z_Ctx.env.Z_LISTEN.get(Z_Key, "json");
    return Response.json({ ...(Z_Cached ?? {}), live: false });
};
