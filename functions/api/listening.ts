import { getCache } from "../_lib/cache";

type ListenEnv = {
    Z_LISTEN: KVNamespace;
};

interface Lanyard {
    listening_to_spotify?: boolean;
    spotify?: {
        song?: string;
        artist?: string;
        album_art_url?: string;
        track_id?: string;
    };
}

interface Stored {
    song: string;
    artist: string;
    art: string;
    id: string;
    t: number;
}

const CACHE = getCache();

function cacheKey(request: Request): Request {
    const url = new URL(request.url);
    return new Request(`${url.origin}${url.pathname}`, { method: "GET" });
}

export const onRequest: PagesFunction<ListenEnv> = async (ctx) => {
    const key = cacheKey(ctx.request);
    if (ctx.request.method === "GET") {
        const hit = await CACHE.match(key);
        if (hit) return hit;
    }
    const res = await track(ctx);
    if (ctx.request.method === "GET") ctx.waitUntil(CACHE.put(key, res.clone()));
    return res;
};

async function track(ctx: EventContext<ListenEnv, string, unknown>) {
    const heads = { "Cache-Control": "public, s-maxage=15" };
    let seen = false;
    try {
        const res = await fetch("https://api.lanyard.rest/v1/users/1007939118925361212");
        if (res.ok) {
            seen = true;
            const body = (await res.json()) as { data?: Lanyard };
            const spotify = body?.data?.spotify;
            if (body?.data?.listening_to_spotify && spotify) {
                const live: Stored = {
                    song: spotify.song ?? "",
                    artist: spotify.artist ?? "",
                    art: spotify.album_art_url ?? "",
                    id: spotify.track_id ?? "",
                    t: Date.now(),
                };
                const previous = await ctx.env.Z_LISTEN.get<Stored>("live", "json");
                if (previous?.id !== live.id) {
                    await ctx.env.Z_LISTEN.put("live", JSON.stringify(live));
                }
                return Response.json({ ...live, live: true }, { headers: heads });
            }
        }
    } catch (error) {
        console.warn("listening: lanyard failed", error);
    }
    if (seen) {
        const was = await ctx.env.Z_LISTEN.get<Stored>("live", "json");
        if (was?.song) {
            const frozen = { ...was, t: Date.now() };
            await ctx.env.Z_LISTEN.put("last", JSON.stringify(frozen));
            await ctx.env.Z_LISTEN.delete("live");
            return Response.json({ ...frozen, live: false }, { headers: heads });
        }
    }
    const last = await ctx.env.Z_LISTEN.get<Stored>("last", "json");
    return Response.json({ ...(last ?? {}), live: false }, { headers: heads });
}
