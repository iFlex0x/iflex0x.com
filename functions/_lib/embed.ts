import { CONFIG } from "./config";
import { escapeHtml } from "./html";

const ACCENT = 12976128;
const IMAGE = "https://media.iflex0x.com/logo.png";

type Component = Record<string, unknown>;

function link(url: string, label: string): Component {
    return { type: 2, style: 5, url, label };
}

function row(components: Component[]): Component {
    return { type: 1, components };
}

function text(content: string): Component {
    return { type: 10, content };
}

function separator(): Component {
    return { type: 14, spacing: 2 };
}

function container(components: Component[]): Component {
    return { type: 17, accent_color: ACCENT, components };
}

function script(component: Component): string {
    const json = JSON.stringify({ component }).replace(/</g, "\\u003c");
    return `<script id="discord:component-embed" type="application/json">${json}</script>`;
}

export function siteEmbed(): string {
    return script(
        container([
            text("## iflex0x"),
            text(
                "content management for youtube creators, end to end.\nthumbnails, edits, production and communities.",
            ),
            separator(),
            row([link("https://github.com/iFlex0x/iflex0x.com", "source")]),
        ]),
    );
}

export function invoiceEmbed(): string {
    return script(
        container([
            text("## invoice"),
            text("a document from iflex0x.\nopen the link to view it."),
            separator(),
            text("-# iflex0x.com"),
        ]),
    );
}

export function ogMeta(opts: { title: string; description: string; url: string }): string {
    const tags = [
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="${escapeHtml(CONFIG.domain)}">`,
        `<meta property="og:title" content="${escapeHtml(opts.title)}">`,
        `<meta property="og:description" content="${escapeHtml(opts.description)}">`,
        `<meta property="og:url" content="${escapeHtml(opts.url)}">`,
        `<meta property="og:image" content="${IMAGE}">`,
        `<meta name="twitter:card" content="summary">`,
        `<meta name="twitter:title" content="${escapeHtml(opts.title)}">`,
        `<meta name="twitter:description" content="${escapeHtml(opts.description)}">`,
        `<meta name="twitter:image" content="${IMAGE}">`,
    ];
    return tags.join("\n");
}

export function invoiceHead(url: string): string {
    return [
        ogMeta({
            title: "invoice",
            description: "a document from iflex0x.",
            url,
        }),
        invoiceEmbed(),
    ].join("\n");
}
