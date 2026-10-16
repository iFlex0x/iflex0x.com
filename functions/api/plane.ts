const Z_Fleet = [
    "82-8000",
    "92-9000",
    "UR-82060",
    "G-BOAC",
    "G-BOAF",
    "F-GSTA",
    "F-WWOW",
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

export const onRequest: PagesFunction = () => {
    const Z_Day = new Date().toISOString().slice(0, 10);
    const Z_Start = Math.floor(Date.parse(`${Z_Day}T00:00:00Z`) / 86400000);
    return Response.json(
        { reg: Z_Fleet[Z_Start % Z_Fleet.length], day: Z_Day },
        { headers: { "Cache-Control": "public, s-maxage=3600" } },
    );
};
