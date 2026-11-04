import { formatNumber, formatUsd } from "./money";
import { formatDisplayDate } from "./dates";
import { linkState, shownStatus } from "./status";
import { escapeHtml } from "./html";
import { pageShell } from "./layout";
import { INVOICE_URL, LIMITS } from "./config";
import { availableActions, type InvoiceAction } from "./actions";
import { parseBody, parseLines } from "./db";
import type { InvoiceListRow, InvoiceRow } from "./types";

const VARIANTS: Record<InvoiceAction, string> = {
    paid: "btn",
    open: "btn",
    void: "btn-secondary",
    restore: "btn",
    extend: "btn-secondary",
    rotate: "btn-danger",
    revoke: "btn-danger",
    unrevoke: "btn-secondary",
};

function field(
    label: string,
    name: string,
    value: string,
    type = "text",
    maxlength?: number,
): string {
    const max = maxlength ? ` maxlength="${maxlength}"` : "";
    return `<label class="field"><span>${escapeHtml(label)}</span><input class="input" type="${type}" name="${name}" value="${escapeHtml(value)}"${max}></label>`;
}

function statusTag(status: string): string {
    return `<span class="status" data-status="${status}">${status}</span>`;
}

function itemRow(item: { title: string; desc: string; qty: string; rate: string }): string {
    return `<div class="inv-row" data-item>
    ${field("title", "title", item.title, "text", LIMITS.itemTitle)}
    ${field("description", "desc", item.desc, "text", LIMITS.itemDesc)}
    ${field("qty", "qty", item.qty)}
    ${field("rate", "rate", item.rate)}
    <button class="btn-danger" type="button" data-remove>remove</button>
</div>`;
}

function actionBar(row: InvoiceRow): string {
    const buttons = availableActions(row)
        .map(
            (button) =>
                `<button class="${VARIANTS[button.action]}" type="button" data-action="${button.action}">${button.label}</button>`,
        )
        .join("");
    return `<div class="actions" data-id="${row.id}">${buttons}</div>`;
}

function renderInvoiceForm(row: InvoiceRow | null, opts: { defaultNumber: string }): string {
    const body = row ? parseBody(row) : null;
    const lines = row ? parseLines(row) : [];
    const items = body?.items ?? [];
    const rows = items.length
        ? items
              .map((item) =>
                  itemRow({
                      title: item.title,
                      desc: item.desc,
                      qty: formatNumber(item.qtyHundredths),
                      rate: (item.rateCents / 100).toFixed(2),
                  }),
              )
              .join("")
        : itemRow({ title: "", desc: "", qty: "1", rate: "0.00" });
    const number = row?.number ?? opts.defaultNumber;
    const discount = body ? (body.discountCents / 100).toFixed(2) : "0.00";
    const tax = body ? formatNumber(body.taxBp) : "0";
    const mode = row ? "edit" : "create";
    const id = row ? ` data-id="${row.id}"` : "";
    const clientLinesMax = LIMITS.clientLines * LIMITS.clientLine + LIMITS.clientLines - 1;

    let html = `<form id="invoice-form" method="post" data-mode="${mode}"${id}>
    <section class="card">
        <h2>details</h2>
        ${field("number", "number", number, "text", LIMITS.number)}
        ${field("client name", "clientName", row?.client_name ?? "", "text", LIMITS.clientName)}
        ${field("client sub", "clientSub", row?.client_sub ?? "", "text", LIMITS.clientSub)}
        <label class="field"><span>client lines</span><textarea class="input" name="clientLines" maxlength="${clientLinesMax}">${escapeHtml(lines.join("\n"))}</textarea></label>
        ${field("issued", "issuedOn", row?.issued_on ?? "", "date")}
        ${field("due", "dueOn", row?.due_on ?? "", "date")}
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
        ${field("discount label", "discountLabel", body?.discountLabel ?? "", "text", LIMITS.discountLabel)}
        ${field("tax %", "taxRate", tax)}
    </section>`;

    html += `
    <section class="card">
        <h2>notes</h2>
        <label class="field"><span>note</span><textarea class="input" name="note" maxlength="${LIMITS.note}">${escapeHtml(body?.note ?? "")}</textarea></label>
    </section>
    <button class="btn" type="submit">${row ? "save changes" : "create invoice"}</button>`;

    return html + "</form>";
}

export function renderAdminNew(opts: { nonce: string; defaultNumber: string }): string {
    const body = `<main id="main" class="content"><h1>new invoice</h1><p id="msg" class="msg" role="status"></p>${renderInvoiceForm(null, { defaultNumber: opts.defaultNumber })}</main>`;
    return pageShell({
        title: "admin / iflex0x",
        nonce: opts.nonce,
        kind: "admin",
        body,
        footer: "site",
        scripts: ["/invoice/admin.js"],
        head: '<link rel="stylesheet" href="/invoice/admin.css">',
    });
}

export function renderAdminList(
    rows: InvoiceListRow[],
    opts: { nonce: string; today: string; email: string },
): string {
    const items = rows
        .map((row) => {
            const state = linkState(row, opts.today);
            const status = state === "live" ? shownStatus(row, opts.today) : state;
            const url = `${INVOICE_URL}/i/${row.token}`;
            const copy =
                state === "live"
                    ? `<button class="btn-secondary" type="button" data-copy="${escapeHtml(url)}">copy link</button>`
                    : `<span class="muted">${state}</span>`;
            return `<div class="list-row">
    <span>${escapeHtml(row.number)}</span>
    <span>${escapeHtml(row.client_name)}</span>
    <span>${formatUsd(row.total_cents)}</span>
    ${statusTag(status)}
    <span>${formatDisplayDate(row.expires_on)}</span>
    ${copy}
    <a class="btn-secondary" href="/admin/invoice/${row.id}">manage</a>
</div>`;
        })
        .join("");

    const body = `<main id="main" class="content">
    <h1>invoices</h1>
    <p class="muted">signed in as ${escapeHtml(opts.email)}</p>
    <p id="msg" class="msg" role="status"></p>
    <p><a class="btn" href="/admin/new">new invoice</a> <a class="btn-secondary" href="${INVOICE_URL}/cdn-cgi/access/logout">sign out</a></p>
    <div class="invoices">${items}</div>
</main>`;

    return pageShell({
        title: "admin / iflex0x",
        nonce: opts.nonce,
        kind: "admin",
        body,
        footer: "site",
        scripts: ["/invoice/admin.js"],
        head: '<link rel="stylesheet" href="/invoice/admin.css">',
    });
}

export function renderAdminDetail(
    row: InvoiceRow,
    opts: { nonce: string; today: string; email: string },
): string {
    const state = linkState(row, opts.today);
    const status = state === "live" ? shownStatus(row, opts.today) : state;
    const url = `${INVOICE_URL}/i/${row.token}`;
    const form = row.status === "open" ? renderInvoiceForm(row, { defaultNumber: row.number }) : "";

    const body = `<main id="main" class="content">
    <p><a href="/admin">back to list</a></p>
    <h1>${escapeHtml(row.number)}</h1>
    <p class="muted">signed in as ${escapeHtml(opts.email)}</p>
    ${statusTag(status)}
    ${form && state !== "live" ? `<p class="muted">this link is ${state}. saving still updates the invoice.</p>` : ""}
    <p id="msg" class="msg" role="status"></p>
    <label class="field"><span>invoice link</span><input class="input" id="invoice-link" readonly value="${escapeHtml(url)}"></label>
    ${actionBar(row)}
    ${form}
</main>`;

    return pageShell({
        title: "admin / iflex0x",
        nonce: opts.nonce,
        kind: "admin",
        body,
        footer: "site",
        scripts: ["/invoice/admin.js"],
        head: '<link rel="stylesheet" href="/invoice/admin.css">',
    });
}
