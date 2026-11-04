import { describe, expect, it } from "vitest";
import { renderAdminDetail, renderAdminList, renderAdminNew } from "../functions/_lib/admin-page";
import type { InvoiceRow } from "../functions/_lib/types";

const row: InvoiceRow = {
    id: "id-1",
    token: "AAAAAAAAAAAAAAAAAAAAAA",
    number: "2026-1103-01",
    client_name: "Acme",
    client_sub: "Acme Ltd",
    client_lines: '["Line one"]',
    issued_on: "2026-11-03",
    due_on: "2026-12-03",
    status: "open",
    paid_on: null,
    expires_on: "2027-02-01",
    revoked_at: null,
    body: JSON.stringify({
        items: [{ title: "Edit", desc: "10 min", qtyHundredths: 100, rateCents: 10000 }],
        discountCents: 0,
        discountLabel: "",
        taxBp: 0,
        note: "",
    }),
    total_cents: 10000,
    created_at: "2026-11-03T00:00:00Z",
    updated_at: "2026-11-03T00:00:00Z",
};

const opts = { nonce: "abc123", today: "2026-11-03", email: "ad@iflex0x.com" };

describe("renderAdminList", () => {
    it("shows number, client, total, link, and manage action", () => {
        const html = renderAdminList([row], opts);
        expect(html).toContain("2026-1103-01");
        expect(html).toContain("Acme");
        expect(html).toContain("$100.00");
        expect(html).toContain("https://invoice.iflex0x.com/i/AAAAAAAAAAAAAAAAAAAAAA");
        expect(html).toContain("/admin/invoice/id-1");
        expect(html).toContain("ad@iflex0x.com");
        expect(html).toContain('id="msg"');
    });
});

describe("renderAdminNew", () => {
    it("renders the form with the default number", () => {
        const html = renderAdminNew({ nonce: "abc123", defaultNumber: "2026-1103-01" });
        expect(html).toContain('name="number"');
        expect(html).toContain("2026-1103-01");
        expect(html).toContain('name="clientName"');
        expect(html).toContain('id="items"');
        expect(html).toContain('id="add-item"');
        expect(html).toContain('method="post"');
        expect(html).toContain('id="msg"');
    });
});

describe("renderAdminDetail", () => {
    it("shows the link and valid open actions", () => {
        const html = renderAdminDetail(row, opts);
        expect(html).toContain("https://invoice.iflex0x.com/i/AAAAAAAAAAAAAAAAAAAAAA");
        expect(html).toContain("mark paid");
        expect(html).toContain("void");
        expect(html).toContain('name="number"');
        expect(html).toContain('data-id="id-1"');
        expect(html).toContain('id="msg"');
        expect(html).toContain('data-status="due"');
    });

    it("shows mark open and no edit form on a paid invoice", () => {
        const html = renderAdminDetail({ ...row, status: "paid", paid_on: "2026-11-03" }, opts);
        expect(html).toContain("mark open");
        expect(html).not.toContain('name="number"');
    });

    it("shows restore and no rotate on a void invoice", () => {
        const html = renderAdminDetail({ ...row, status: "void" }, opts);
        expect(html).toContain("restore");
        expect(html).not.toContain("rotate link");
    });
});
