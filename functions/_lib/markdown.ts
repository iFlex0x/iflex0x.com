import { escapeHtml } from "./html";

const TOKEN = /`([^`\n]+)`|\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)|(https?:\/\/[^\s<>"']+)/gi;
const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function safeUrl(value: string): string | null {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:"
            ? value
            : null;
    } catch {
        return null;
    }
}

function trimBare(value: string): { url: string; tail: string } {
    let end = value.length;
    while (end > 0) {
        const char = value[end - 1];
        if (".,!?;:".includes(char)) {
            end--;
            continue;
        }
        const opener = CLOSERS[char];
        if (opener) {
            const before = value.slice(0, end - 1);
            const opens = before.split(opener).length - 1;
            const closes = before.split(char).length - 1;
            if (opens <= closes) {
                end--;
                continue;
            }
        }
        break;
    }
    return { url: value.slice(0, end), tail: value.slice(end) };
}

function inline(value: string): string {
    return escapeHtml(value)
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
        .replace(/(^|[^\w*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
        .replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>")
        .replace(/\n/g, "<br>");
}

function link(label: string, url: string): string {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

export function renderMarkdown(value: string): string {
    const input = value.replace(/\r\n?/g, "\n");
    const salt = crypto.randomUUID();
    const tokens: string[] = [];
    let tokenized = "";
    let last = 0;

    for (const match of input.matchAll(TOKEN)) {
        const index = match.index ?? 0;
        tokenized += input.slice(last, index);
        last = index + match[0].length;

        let html: string;
        if (match[1] !== undefined) {
            html = `<code>${escapeHtml(match[1])}</code>`;
        } else if (match[2] !== undefined && match[3] !== undefined) {
            const url = safeUrl(match[3]);
            html = url ? link(inline(match[2]), url) : inline(match[0]);
        } else {
            const bare = match[4];
            const { url: target, tail } = trimBare(bare);
            const url = safeUrl(target);
            html = url ? link(escapeHtml(target), url) + inline(tail) : inline(bare);
        }

        tokenized += `\uE000${salt}:${tokens.length}\uE001`;
        tokens.push(html);
    }

    return inline(tokenized + input.slice(last)).replace(
        new RegExp(`\\uE000${salt}:(\\d+)\\uE001`, "g"),
        (_, index: string) => tokens[Number(index)] ?? "",
    );
}
