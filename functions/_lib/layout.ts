import { CONFIG, SITE_URL } from "./config";
import { escapeHtml } from "./html";
import { htmlResponse, textResponse } from "./http";
import type { PageKind } from "./http";

type FooterOptions =
    | { footer: "site" }
    | { footer: "document"; footerMeta: { number: string; expiry: string } }
    | { footer: "none" };

export type PageShellOptions = {
    title: string;
    nonce?: string;
    kind: PageKind;
    body: string;
    scripts?: string[];
    head?: string;
} & FooterOptions;

const PREPAINT = `try {
    var Z_T = localStorage.getItem("Z_Theme");
    if (!Z_T)
        Z_T = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    if (Z_T === "light") document.documentElement.classList.add("Z_Light");
} catch (Z_E) {}
document.addEventListener(
    "error",
    (Z_E) => {
        const Z_Img = Z_E.target;
        if (Z_Img && Z_Img.tagName === "IMG" && Z_Img.dataset.fallback) {
            Z_Img.onerror = null;
            Z_Img.src = Z_Img.dataset.fallback;
        }
    },
    true,
);`;

const MOON = `<svg class="Z_Moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>`;

const SUN = `<svg class="Z_Sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;

const THEME_BUTTON = `<button class="Z_Theme" id="Z_Theme" type="button" aria-pressed="false" aria-label="light mode">${MOON}${SUN}</button>`;

const PRINT_BUTTON = `<button class="Z_Print" id="print" type="button" aria-label="print" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></button>`;

function siteFooter(): string {
    const year = new Date().getFullYear();
    return `<footer>
    <div class="foot-row">
        <span>iflex0x</span>
        <a href="https://github.com/iFlex0x/iflex0x.com" rel="noopener noreferrer">source</a>
        <a href="mailto:${escapeHtml(CONFIG.email)}">mail</a>
        <span class="Z_Zulu" id="Z_Zulu">--:--:--</span>
    </div>
    <div class="foot-theme">${THEME_BUTTON}</div>
    <p class="credits">inspired by <a href="https://iamw.ing/" rel="noopener noreferrer">iamw.ing</a>, <a href="https://bignut.zip/" rel="noopener noreferrer">bignut.zip</a>, hugo drawn by <a href="https://www.instagram.com/neptunicsunset/" rel="noopener noreferrer">neptunicsunset</a>.</p>
    <p class="copyright">© ${year} iflex0x</p>
</footer>`;
}

function documentFooter(meta: { number: string; expiry: string }): string {
    return `<footer class="doc-foot">
    <span><b>iflex0x</b> / <a href="${escapeHtml(SITE_URL)}">${escapeHtml(CONFIG.domain)}</a></span>
    <span class="doc-foot-meta">
        <span>invoice #${escapeHtml(meta.number)}</span>
        <span>link valid until ${escapeHtml(meta.expiry)}</span>
    </span>
</footer>
<div class="doc-controls">${THEME_BUTTON}${PRINT_BUTTON}</div>`;
}

export function pageShell(opts: PageShellOptions): string {
    const themed = opts.kind !== "error";
    const scripts = [...(themed ? ["/invoice/theme.js"] : []), ...(opts.scripts ?? [])]
        .map((src) => `<script src="${src}" defer></script>`)
        .join("");
    const footer =
        opts.footer === "site"
            ? siteFooter()
            : opts.footer === "document"
              ? documentFooter(opts.footerMeta)
              : "";
    const themeScript = themed ? `<script nonce="${opts.nonce}">${PREPAINT}</script>` : "";
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.title)}</title>
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
<meta name="referrer" content="no-referrer">
<meta name="darkreader-lock">
<meta name="color-scheme" content="dark light">
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

function errorPage(
    title: string,
    message: string,
    status: number,
    link?: { href: string; label: string },
): Response {
    const anchor = link
        ? ` <a href="${escapeHtml(link.href)}" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
        : "";
    const body = `<main id="main" class="Z_Room"><section class="card" aria-labelledby="error-heading"><div class="head"><span class="chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg></span><h1 id="error-heading">${escapeHtml(title)}</h1></div><p>${escapeHtml(message)}${anchor}</p></section></main>`;
    return htmlResponse(
        pageShell({ title: `${title} / iflex0x`, kind: "error", body, footer: "none" }),
        {
            kind: "error",
            status,
        },
    );
}

export function notFoundPage(): Response {
    return errorPage("not found", "this link doesn't point to an invoice.", 404, {
        href: SITE_URL,
        label: "iflex0x.com",
    });
}

export function gonePage(): Response {
    return errorPage("link expired", "this link expired. ask for a fresh one:", 410, {
        href: `mailto:${CONFIG.email}`,
        label: CONFIG.email,
    });
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
    return textResponse("User-agent: *\nDisallow: /\n", 200, {
        "Cache-Control": "public, max-age=3600",
    });
}
