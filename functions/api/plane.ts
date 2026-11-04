import { CONFIG } from "../_lib/config";

type Fleet = { reg: string; file: string };

const FLEET: Fleet[] = [
    { reg: "82-8000", file: "File:82-8000@PEK (20171108141951).jpg" },
    { reg: "92-9000", file: "File:92-9000@PEK (20141110091435).JPG" },
    { reg: "UR-82060", file: "File:UR-82060@TSN (20200426124033).jpg" },
    { reg: "G-BOAC", file: "File:British Airways Concorde G-BOAC 02.jpg" },
    { reg: "G-BOAF", file: "File:British Airways Concorde G-BOAF (25857645176).jpg" },
    { reg: "F-GSTA", file: "File:Airbus Beluga 1 F-GSTA 02.jpg" },
    { reg: "F-WWEA", file: "File:A380 F-WWEA LEGT 2.jpg" },
    { reg: "F-WXLR", file: "File:F-WXLR, ILA 2024, Schoenefeld (ILA45296).jpg" },
    { reg: "N905NA", file: "File:Shuttle Carrier Aircraft N905NA at Space Center Houston.jpg" },
    { reg: "N780BA", file: "File:07142018 Boeing Company B744LCF N780BA KPAE NASEDIT2 (43830183822).jpg" },
    { reg: "N787BA", file: "File:N787BA Boeing 787 Boeing Co (7286114022).jpg" },
    { reg: "JA873A", file: "File:JA873A@PEK (20200705130524).jpg" },
    { reg: "JA789A", file: "File:ANA Boeing 777-300ER; JA789A@HKG;04.08.2011 615ge (6207793648).jpg" },
    { reg: "G-EUPJ", file: "File:20251011 British Airways G-EUPJ EGLL.jpg" },
    { reg: "9V-SKA", file: "File:9V-SKA@PEK (20170309171352).jpg" },
    { reg: "VH-OQA", file: "File:Qantas a380 vh-oqa takeoff heathrow arp.jpg" },
    { reg: "D-ABYT", file: "File:D-ABYT@HKG (20190222160855).jpg" },
    { reg: "PH-BVA", file: "File:KLM B777-306ER (PH-BVA) at Amsterdam Airport Schiphol (1).jpg" },
    { reg: "A7-ANB", file: "File:A7-ANB 09072018LHR (29510026258).jpg" },
    { reg: "TF-AAK", file: "File:Air Atlanta Icelandic Boeing 747-428 TF-AAK \"Ed Force One\" (26808846474).jpg" },
];

type CommonsInfo = {
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    extmetadata?: {
        Artist?: { value?: string };
        LicenseShortName?: { value?: string };
    };
};

const CACHE = (caches as unknown as { default: Cache }).default;

async function picture(plane: Fleet) {
    const query = new URL("https://commons.wikimedia.org/w/api.php");
    query.searchParams.set("action", "query");
    query.searchParams.set("titles", plane.file);
    query.searchParams.set("prop", "imageinfo");
    query.searchParams.set("iiprop", "url|extmetadata");
    query.searchParams.set("iiurlwidth", "1280");
    query.searchParams.set("format", "json");
    query.searchParams.set("origin", "*");

    const res = await fetch(query, { headers: { "User-Agent": `iflex0x.com (${CONFIG.email})` } });
    if (!res.ok) return null;

    const body = (await res.json()) as { query?: { pages?: Record<string, { imageinfo?: CommonsInfo[] }> } };
    const info = Object.values(body.query?.pages ?? {})[0]?.imageinfo?.[0];
    if (!info) return null;
    const src = info.thumburl ?? info.url;
    if (!src) return null;

    const artist = String(info.extmetadata?.Artist?.value ?? "").replace(/<[^>]*>/g, "").trim();
    const license = info.extmetadata?.LicenseShortName?.value ?? "";
    const by = artist || "Wikimedia Commons";

    return {
        reg: plane.reg,
        src,
        alt: plane.reg,
        link: info.descriptionurl ?? "",
        by: license ? `${by} (${license})` : by,
    };
}

export const onRequest: PagesFunction = async (ctx) => {
    const key = new URL(ctx.request.url);
    const cacheKey = new Request(`${key.origin}${key.pathname}`);
    const hit = await CACHE.match(cacheKey);
    if (hit) return hit;

    const day = new Date().toISOString().slice(0, 10);
    const start = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);
    const plane = FLEET[start % FLEET.length];

    let payload: Awaited<ReturnType<typeof picture>> = null;
    try {
        payload = await picture(plane);
    } catch (error) {
        console.error("plane: commons failed", error);
    }

    const res = Response.json(payload ?? {}, { headers: { "Cache-Control": "public, s-maxage=3600" } });
    ctx.waitUntil(CACHE.put(cacheKey, res.clone()));

    return res;
};
