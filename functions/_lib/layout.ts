import { CONFIG } from "./config";
import { escapeHtml } from "./html";
import { htmlResponse, textResponse } from "./http";
import type { PageKind } from "./http";

export type PageShellOptions = {
    title: string;
    nonce: string;
    kind: PageKind;
    body: string;
    footer: "site" | "document" | "none";
    footerMeta?: { number: string; expiry: string };
    scripts?: string[];
    showTheme?: boolean;
    head?: string;
};

const PREPAINT =
    'try{var Z_T=localStorage.getItem("Z_Theme");if(!Z_T)Z_T=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";if(Z_T==="light")document.documentElement.classList.add("Z_Light")}catch(Z_E){}';

const MOON =
    '<svg class="Z_Moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" /></svg>';

const SUN =
    '<svg class="Z_Sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>';

const THEME_BUTTON =
    '<button class="Z_Theme" id="Z_Theme" type="button" aria-pressed="false" aria-label="light mode">' +
    MOON +
    SUN +
    "</button>";

function siteFooter(): string {
    const year = new Date().getUTCFullYear();
    const html = `<footer>
    <div class="foot-row">
        <span>iflex0x</span>
        <a href="https://github.com/iFlex0x/iflex0x.com" rel="noopener noreferrer">source</a>
        <a href="mailto:${CONFIG.email}">mail</a>
        <span class="Z_Zulu" id="Z_Zulu">--:--:--</span>
    </div>
    <div class="foot-theme">${THEME_BUTTON}</div>
    <p class="credits">inspired by <a href="https://iamw.ing/" rel="noopener noreferrer">iamw.ing</a>, <a href="https://bignut.zip/" rel="noopener noreferrer">bignut.zip</a>, hugo drawn by <a href="https://www.instagram.com/neptunicsunset/" rel="noopener noreferrer">neptunicsunset</a>.</p>
    <p class="copyright">© ${year} iflex0x</p>
</footer>`;

    return html;
}

function documentFooter(meta: { number: string; expiry: string }): string {
    return `<footer class="doc-foot">
    <div class="foot-row">
        <span>iflex0x / <a href="${CONFIG.siteUrl}">iflex0x.com</a></span>
        <span class="Z_Zulu">${escapeHtml(meta.number)}</span>
        <span class="Z_Zulu">link valid until ${escapeHtml(meta.expiry)}</span>
    </div>
    <div class="foot-theme">
        ${THEME_BUTTON}
        <button id="print" class="btn-secondary" type="button" hidden>print</button>
    </div>
</footer>`;
}

export function pageShell(opts: PageShellOptions): string {
    const scripts = (opts.scripts ?? []).map((src) => `<script src="${src}" defer></script>`).join("");
    const footer =
        opts.footer === "site"
            ? siteFooter()
            : opts.footer === "document"
              ? documentFooter(opts.footerMeta ?? { number: "", expiry: "" })
              : "";
    const themeScript = (opts.showTheme ?? true) ? `<script nonce="${opts.nonce}">${PREPAINT}</script>` : "";

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.title)}</title>
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
<meta name="referrer" content="no-referrer">
<meta name="darkreader-lock">
<meta name="theme-color" content="#070707">
<link rel="icon" href="/favicon.png">
<link rel="preload" href="/invoice/fonts/atkinson-hyperlegible-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/invoice/fonts/atkinson-hyperlegible-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/invoice/site.css">
${opts.head ?? ""}
${themeScript}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${opts.body}`;

    return html + footer + scripts + "</body></html>";
}

function errorPage(title: string, message: string, status: number): Response {
    let body = `<main id="main" class="Z_Room"><section class="card" aria-labelledby="error-heading"><div class="head"><span class="chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg></span><h1 id="error-heading">${escapeHtml(title)}</h1></div>`;
    body += `<p>${message}</p></section></main>`;

    return htmlResponse(
        pageShell({ title: `${title} / iFlex`, nonce: "", kind: "error", body, footer: "none", showTheme: false }),
        { kind: "error", status },
    );
}

export function notFoundPage(): Response {
    return errorPage("not found", `this link doesn't point to an invoice. <a href="${CONFIG.siteUrl}">iflex0x.com</a>`, 404);
}

export function gonePage(): Response {
    return errorPage("link expired", `ask <a href="mailto:${CONFIG.email}">${CONFIG.email}</a> for a fresh one.`, 410);
}

export function forbiddenPage(): Response {
    return errorPage("forbidden", "this page is not available.", 403);
}

export function serverErrorPage(): Response {
    return errorPage("something broke", "try again later.", 500);
}

export function unavailablePage(): Response {
    const response = errorPage("temporarily unavailable", "try again in a minute.", 503);
    response.headers.set("Retry-After", "30");
    return response;
}

export function robotsResponse(): Response {
    return textResponse("User-agent: *\nDisallow: /\n", 200, { "Cache-Control": "public, max-age=3600" });
}