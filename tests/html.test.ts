import { describe, expect, it } from "vitest";
import { escapeHtml, preserveLines } from "../functions/_lib/html";

describe("escaping", () => {
    it("escapes markup and quotes", () => {
        expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
    });

    it("preserves line breaks after escaping", () => {
        expect(preserveLines("a\nb")).toBe("a<br>b");
        expect(preserveLines("a\r\nb")).toBe("a<br>b");
        expect(preserveLines("<b>\n")).toBe("&lt;b&gt;<br>");
    });
});
