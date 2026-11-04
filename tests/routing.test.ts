import { describe, expect, it } from "vitest";
import { decideRoute } from "../functions/_lib/routing";

const invoice = "invoice.iflex0x.com";
const apex = "iflex0x.com";
const pages = "iflex0x.pages.dev";

describe("invoice host", () => {
    it("serves invoice and admin paths", () => {
        expect(decideRoute(invoice, "/i/abc")).toEqual({ kind: "pass" });
        expect(decideRoute(invoice, "/admin")).toEqual({ kind: "pass" });
        expect(decideRoute(invoice, "/admin/api/invoices")).toEqual({ kind: "pass" });
    });

    it("serves robots and public assets", () => {
        expect(decideRoute(invoice, "/robots.txt")).toEqual({ kind: "robots" });
        expect(decideRoute(invoice, "/_astro/site.css")).toEqual({ kind: "pass" });
        expect(decideRoute(invoice, "/invoice/qr.png")).toEqual({ kind: "pass" });
        expect(decideRoute(invoice, "/logo.png")).toEqual({ kind: "pass" });
    });

    it("blocks site pages, sitemap, and work images", () => {
        expect(decideRoute(invoice, "/")).toEqual({ kind: "not-found" });
        expect(decideRoute(invoice, "/sitemap-index.xml")).toEqual({ kind: "not-found" });
        expect(decideRoute(invoice, "/work/fierce.jpg")).toEqual({ kind: "not-found" });
        expect(decideRoute(invoice, "/i")).toEqual({ kind: "not-found" });
    });
});

describe("apex host", () => {
    it("passes site paths", () => {
        expect(decideRoute(apex, "/")).toEqual({ kind: "pass" });
        expect(decideRoute(apex, "/work/fierce.jpg")).toEqual({ kind: "pass" });
        expect(decideRoute(apex, "/robots.txt")).toEqual({ kind: "pass" });
    });

    it("blocks invoice and admin paths", () => {
        expect(decideRoute(apex, "/i/abc")).toEqual({ kind: "not-found" });
        expect(decideRoute(apex, "/admin")).toEqual({ kind: "not-found" });
        expect(decideRoute(apex, "/admin/api/invoices")).toEqual({ kind: "not-found" });
    });
});

describe("pages.dev", () => {
    it("redirects invoice and admin paths to the invoice host", () => {
        expect(decideRoute(pages, "/i/abc")).toEqual({ kind: "redirect", host: invoice });
        expect(decideRoute(pages, "/admin")).toEqual({ kind: "redirect", host: invoice });
    });

    it("redirects everything else to the apex", () => {
        expect(decideRoute(pages, "/")).toEqual({ kind: "redirect", host: apex });
        expect(decideRoute(pages, "/work/fierce.jpg")).toEqual({ kind: "redirect", host: apex });
    });
});

describe("cloudflare paths", () => {
    it("always passes cdn-cgi", () => {
        expect(decideRoute(invoice, "/cdn-cgi/access/login")).toEqual({ kind: "pass" });
        expect(decideRoute(pages, "/cdn-cgi/access/login")).toEqual({ kind: "pass" });
    });
});