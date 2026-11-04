import { describe, expect, it } from "vitest";
import { qrSvg } from "../functions/_lib/qr";

describe("qrSvg", () => {
    it("renders an inline svg with the qr class and label", () => {
        const svg = qrSvg("https://paypal.me/iflex8/50.00USD");
        expect(svg.startsWith("<svg ")).toBe(true);
        expect(svg).toContain('class="qr"');
        expect(svg).toContain('role="img"');
        expect(svg).toContain('aria-label="PayPal QR code"');
        expect(svg).toContain('viewBox="0 0 ');
        expect(svg).toContain("<path");
        expect(svg).not.toContain("<script");
    });

    it("encodes different urls differently", () => {
        expect(qrSvg("https://paypal.me/iflex8/50.00USD")).not.toBe(
            qrSvg("https://paypal.me/iflex8/60.00USD"),
        );
    });

    it("keeps the amount out of the markup", () => {
        const svg = qrSvg("https://paypal.me/iflex8/50.00USD");
        expect(svg).not.toContain("50.00USD");
    });
});
