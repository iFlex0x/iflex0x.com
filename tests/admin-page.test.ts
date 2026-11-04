import { describe, expect, it } from "vitest";
import { renderAdminDetail, renderAdminList, renderAdminNew } from "../functions/_lib/admin-page";
import { addDaysIso } from "../functions/_lib/dates";
import { CONFIG } from "../functions/_lib/config";
import type { InvoiceRow } from "../functions/_lib/types";

const issued = "2026-11-03";
const expires = addDaysIso(issued, CONFIG.expiryDays);

const row: InvoiceRow = {
    id: "id-1",
    token: "AAAAAAAAAAAAAAAAAAAAAA",
    number: "2026-1103-01",
    client_name: "Acme",
    client_sub: "Acme Ltd",
    client_lines: '["Line one"]',
    issued_on: issued,
    due_on: "2026-12-03",
    status: "open",
    paid_on: null,
    expires_on: expires,
    revoked_at: null,
    body: JSON.stringify({
        items: [{ title: "Edit", desc: "10 min", qtyHundredths: 100, rateCents: 10000 }],
        discountCents: 0,
        discountLabel: "",
        taxBp: 0,
        note: "",
    }),
    subtotal_cents: 10000,
    discount_cents: 0,
    tax_cents: 0,
    total_cents: 10000,
    created_at: "2026-11-03T00:00:00Z",
    updated_at: "2026-11-03T00:00:00Z",
};

const opts = { nonce: "abc123", today: issued, email: CONFIG.email };

describe("renderAdminList", () => {
    it("shows number, client, total, link, and manage action", () => {
        const html = renderAdminList([row], opts);
        expect(html).toContain('class="list-row"');
        expect(html).toContain("2026-1103-01");
        expect(html).toContain("Acme");
        expect(html).toContain("$100.00");
        expect(html).toContain(`data-copy="https://invoice.iflex0x.com/i/AAAAAAAAAAAAAAAAAAAAAA"`);
        expect(html).toContain('href="/admin/invoice/id-1"');
        expect(html).toContain(CONFIG.email);
        expect(html).toContain('id="msg"');
    });
});

describe("renderAdminNew", () => {
    it("renders the form with the default number", () => {
        const html = renderAdminNew({ nonce: "abc123", defaultNumber: "2026-1103-01" });
        expect(html).toContain('name="number"');
        expect(html).toContain('maxlength="40"');
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
        expect(html).toContain('data-action="paid"');
        expect(html).toContain('data-action="void"');
        expect(html).toContain('data-action="rotate"');
        expect(html).toContain('name="number"');
        expect(html).toContain('data-id="id-1"');
        expect(html).toContain('id="msg"');
        expect(html).toContain('data-status="due"');
    });

    it("shows mark open and no edit form on a paid invoice", () => {
        const html = renderAdminDetail({ ...row, status: "paid", paid_on: issued }, opts);
        expect(html).toContain('data-action="open"');
        expect(html).not.toContain('data-action="paid"');
        expect(html).not.toContain('name="number"');
    });

    it("shows restore and no rotate on a void invoice", () => {
        const html = renderAdminDetail({ ...row, status: "void" }, opts);
        expect(html).toContain('data-action="restore"');
        expect(html).not.toContain('data-action="rotate"');
    });

    it("warns when editing an open invoice whose link is dead", () => {
        const html = renderAdminDetail({ ...row, expires_on: "2020-01-01" }, opts);
        expect(html).toContain("this link is expired");
        expect(html).toContain('name="number"');
    });
});
