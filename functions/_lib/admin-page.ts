import { formatUsd, type InvoiceBody } from "./money";
import { formatDisplayDate } from "./dates";
import { linkState, shownStatus } from "./status";
import { escapeAttr, escapeHtml } from "./html";
import { pageShell } from "./layout";
import { CONFIG } from "./config";
import type { InvoiceRow } from "./types";

export function renderAdminDetail(
    row: InvoiceRow,
    opts: { nonce: string; today: string; email: string },
): string {
    const state = linkState(row, opts.today);
    const status = state === "live" ? shownStatus(row, opts.today) : state;
    const url = `${CONFIG.invoiceUrl}/i/${row.token}`;
    const actions = [
        row.status === "open" ? `<button class="btn" type="button" data-action="paid">mark paid</button>` : "",
        row.status === "paid" ? `<button class="btn" type="button" data-action="open">mark open</button>` : "",
        row.status === "void" ? `<button class="btn" type="button" data-action="restore">restore</button>` : "",
        row.status !== "void" ? `<button class="btn-secondary" type="button" data-action="void">void</button>` : "",
        row.status !== "void" ? `<button class="btn-secondary" type="button" data-action="extend">extend 90 days</button>` : "",
        row.status !== "void" ? `<button class="btn-danger" type="button" data-action="rotate">rotate link</button>` : "",
        row.revoked_at === null ? `<button class="btn-danger" type="button" data-action="revoke">revoke</button>` : "",
        row.revoked_at !== null ? `<button class="btn-secondary" type="button" data-action="unrevoke">unrevoke</button>` : "",
    ].join("");

    const form = row.status === "open" ? renderInvoiceForm(row, { defaultNumber: row.number }) : "";
    const body = `<main id="main" class="content"><p><a href="/admin">back to list</a></p><h1>${escapeHtml(row.number)}</h1><p class="Z_Zulu">signed in as ${escapeHtml(opts.email)}</p><p data-status="${escapeAttr(status)}">${escapeHtml(status)}</p><label class="field"><span>invoice link</span><input class="input" readonly value="${escapeAttr(url)}"></label><div class="actions">${actions}</div>${form}</main>`;

    return pageShell({
        title: "admin / iFlex",
        nonce: opts.nonce,
        kind: "admin",
        body,
        footer: "site",
        scripts: ["/invoice/admin.js"],
        head: '<link rel="stylesheet" href="/invoice/admin.css">',
    });
}

function field(label: string, name: string, value: string, type = "text"): string {
    return `<label class="field"><span>${escapeHtml(label)}</span><input class="input" type="${type}" name="${name}" value="${escapeAttr(value)}"></label>`;
}

function itemRow(item: { title: string; desc: string; qty: string; rate: string }): string {
    return `<div class="inv-row" data-item>
    ${field("title", "title", item.title)}
    ${field("description", "desc", item.desc)}
    ${field("qty", "qty", item.qty)}
    ${field("rate", "rate", item.rate)}
    <button class="btn-danger" type="button" data-remove>remove</button>
</div>`;
}

function renderInvoiceForm(row: InvoiceRow | null, opts: { defaultNumber: string }): string {
    const body = row ? (JSON.parse(row.body) as InvoiceBody) : null;
    const lines = row ? (JSON.parse(row.client_lines) as string[]) : [];
    const items = body?.items ?? [];
    const rows = items.length
        ? items
              .map((item) =>
                  itemRow({
                      title: item.title,
                      desc: item.desc,
                      qty: (item.qtyHundredths / 100).toFixed(2).replace(/\.?0+$/, ""),
                      rate: (item.rateCents / 100).toFixed(2),
                  }),
              )
              .join("")
        : itemRow({ title: "", desc: "", qty: "1", rate: "0.00" });
    const number = row?.number ?? opts.defaultNumber;
    const issued = row?.issued_on ?? "";
    const due = row?.due_on ?? "";
    const discount = body ? (body.discountCents / 100).toFixed(2) : "0.00";
    const tax = body ? (body.taxBp / 100).toFixed(2) : "0.00";
    const note = body?.note ?? "";
    const label = body?.discountLabel ?? "";
    const mode = row ? "edit" : "create";
    const id = row ? ` data-id="${escapeAttr(row.id)}"` : "";

    let html = `<form id="invoice-form" data-mode="${mode}"${id}>
    <section class="card">
        <h2>details</h2>
        ${field("number", "number", number)}
        ${field("client name", "clientName", row?.client_name ?? "")}
        ${field("client sub", "clientSub", row?.client_sub ?? "")}
        <label class="field"><span>client lines</span><textarea class="input" name="clientLines">${escapeHtml(lines.join("\n"))}</textarea></label>
        ${field("issued", "issuedOn", issued, "date")}
        ${field("due", "dueOn", due, "date")}
    </section>`;

    html += `
    <section class="card">
        <h2>items</h2>
        <div id="items">${rows}</div>
        <button class="btn-secondary" type="button" id="add-item">add item</button>
    </section>`;

    html += `
    <section class="card">
        <h2>totals</h2>
        ${field("discount", "discount", discount)}
        ${field("discount label", "discountLabel", label)}
        ${field("tax %", "taxRate", tax)}
        <p class="total-preview" id="total-preview">${formatUsd(row?.total_cents ?? 0)}</p>
    </section>`;

    html += `
    <section class="card">
        <h2>notes</h2>
        <label class="field"><span>note</span><textarea class="input" name="note">${escapeHtml(note)}</textarea></label>
    </section>
    <button class="btn" type="submit">${row ? "save changes" : "create invoice"}</button>`;

    return html + "</form>";
}

export function renderAdminNew(opts: { nonce: string; today: string; defaultNumber: string }): string {
    const body = `<main id="main" class="content"><h1>new invoice</h1>${renderInvoiceForm(null, { defaultNumber: opts.defaultNumber })}</main>`;

    return pageShell({
        title: "admin / iFlex",
        nonce: opts.nonce,
        kind: "admin",
        body,
        footer: "site",
        scripts: ["/invoice/admin.js"],
        head: '<link rel="stylesheet" href="/invoice/admin.css">',
    });
}

export function renderAdminList(
    rows: InvoiceRow[],
    opts: { nonce: string; today: string; email: string },
): string {
    const items = rows
        .map((row) => {
            const state = linkState(row, opts.today);
            const status = state === "live" ? shownStatus(row, opts.today) : state;
            const url = `${CONFIG.invoiceUrl}/i/${row.token}`;
            const copy =
                state === "live"
                    ? `<button class="btn-secondary" type="button" data-copy="${escapeAttr(url)}">copy link</button>`
                    : `<span class="Z_Zulu">${state}</span>`;
            return `<div class="inv-row"><span>${escapeHtml(row.number)}</span><span>${escapeHtml(row.client_name)}</span><span>${formatUsd(row.total_cents)}</span><span data-status="${escapeAttr(status)}">${escapeHtml(status)}</span><span>${formatDisplayDate(row.expires_on)}</span>${copy}<a class="btn-secondary" href="/admin/invoice/${escapeAttr(row.id)}">manage</a></div>`;
        })
        .join("");

    const body = `<main id="main" class="content"><h1>invoices</h1><p class="Z_Zulu">signed in as ${escapeHtml(opts.email)}</p><p><a class="btn" href="/admin/new">new invoice</a> <a class="btn-secondary" href="${CONFIG.invoiceUrl}/cdn-cgi/access/logout">sign out</a></p><div class="invoices">${items}</div></main>`;

    return pageShell({
        title: "admin / iFlex",
        nonce: opts.nonce,
        kind: "admin",
        body,
        footer: "site",
        scripts: ["/invoice/admin.js"],
        head: '<link rel="stylesheet" href="/invoice/admin.css">',
    });
}