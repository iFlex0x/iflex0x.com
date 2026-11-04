import { formatNumber, formatUsd } from "./money";
import { formatDisplayDate } from "./dates";
import { linkState, shownStatus } from "./status";
import { escapeHtml } from "./html";
import { pageShell } from "./layout";
import { INVOICE_URL, LIMITS } from "./config";
import { availableActions, type InvoiceAction } from "./actions";
import { parseBody, parseLines } from "./db";
import { chip, chipIcon, statusTag } from "./ui";
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

const TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

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

function itemRow(item: { title: string; desc: string; qty: string; rate: string }): string {
    return `<div class="inv-row" data-item>
    ${field("title", "title", item.title, "text", LIMITS.itemTitle)}
    ${field("description", "desc", item.desc, "text", LIMITS.itemDesc)}
    ${field("qty", "qty", item.qty)}
    ${field("rate", "rate", item.rate)}
    <button class="icon-btn" type="button" data-remove aria-label="remove item">${TRASH}</button>
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

    let html = `<form class="invoice-form" id="invoice-form" method="post" data-mode="${mode}"${id}>
    <section class="card">
        ${chip("file", "details", "details-heading")}
        <div class="field-grid">
            ${field("number", "number", number, "text", LIMITS.number)}
            ${field("client name", "clientName", row?.client_name ?? "", "text", LIMITS.clientName)}
        </div>
        ${field("client sub", "clientSub", row?.client_sub ?? "", "text", LIMITS.clientSub)}
        <label class="field"><span>client lines</span><textarea class="input" name="clientLines" maxlength="${clientLinesMax}">${escapeHtml(lines.join("\n"))}</textarea></label>
        <div class="field-grid">
            ${field("issued", "issuedOn", row?.issued_on ?? "", "date")}
            ${field("due", "dueOn", row?.due_on ?? "", "date")}
        </div>
    </section>`;

    html += `
    <section class="card">
        ${chip("list", "items", "items-heading")}
        <div class="inv-rows" id="items">${rows}</div>
        <button class="btn-secondary" type="button" id="add-item">add item</button>
    </section>`;

    html += `
    <section class="card">
        ${chip("calculator", "totals", "totals-heading")}
        <div class="field-grid">
            ${field("discount", "discount", discount)}
            ${field("discount label", "discountLabel", body?.discountLabel ?? "", "text", LIMITS.discountLabel)}
        </div>
        ${field("tax %", "taxRate", tax)}
        <p class="hint">totals are calculated when you save.</p>
    </section>`;

    html += `
    <section class="card">
        ${chip("pencil", "notes", "notes-heading")}
        <label class="field"><span>note</span><textarea class="input" name="note" maxlength="${LIMITS.note}">${escapeHtml(body?.note ?? "")}</textarea></label>
    </section>
    <div class="form-actions"><button class="btn" type="submit">${row ? "save changes" : "create invoice"}</button></div>`;

    return html + "</form>";
}

export function renderAdminNew(opts: { nonce: string; defaultNumber: string }): string {
    const body = `<main id="main" class="content admin">
    <header class="page-head">
        <div>
            <a class="back" href="/admin">&larr; invoices</a>
            <h1>new invoice</h1>
        </div>
    </header>
    <p id="msg" class="msg" role="status"></p>
    ${renderInvoiceForm(null, { defaultNumber: opts.defaultNumber })}
</main>`;
    return pageShell({
        title: "new invoice / iflex0x",
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
            const status = shownStatus(row, opts.today);
            const url = `${INVOICE_URL}/i/${row.token}`;
            const copy =
                state === "live"
                    ? `<button class="btn-secondary" type="button" data-copy="${escapeHtml(url)}">copy link</button>`
                    : `<span class="list-state">${state}</span>`;
            return `<div class="list-row">
    <div class="list-main">
        <span class="list-number">#${escapeHtml(row.number)}</span>
        <span class="list-client">${escapeHtml(row.client_name)}</span>
    </div>
    <span class="list-total">${formatUsd(row.total_cents)}</span>
    ${statusTag(status)}
    <span class="list-expiry">${formatDisplayDate(row.expires_on)}</span>
    <div class="list-actions">
        ${copy}
        <a class="btn-secondary" href="/admin/invoice/${row.id}">manage</a>
    </div>
</div>`;
        })
        .join("");

    const body = `<main id="main" class="content admin">
    <header class="page-head">
        <div>
            <h1>invoices</h1>
            <p class="muted">signed in as ${escapeHtml(opts.email)}</p>
        </div>
        <div class="page-actions">
            <a class="btn" href="/admin/new">new invoice</a>
            <a class="btn-secondary" href="${INVOICE_URL}/cdn-cgi/access/logout">sign out</a>
        </div>
    </header>
    <p id="msg" class="msg" role="status"></p>
    <section class="card" aria-labelledby="list-heading">
        <div class="head">${chipIcon("list")}<h2 id="list-heading">all invoices</h2><span class="count">${rows.length}</span></div>
        ${rows.length ? items : `<p class="empty">no invoices yet.</p>`}
    </section>
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
    const status = shownStatus(row, opts.today);
    const url = `${INVOICE_URL}/i/${row.token}`;
    const form = row.status === "open" ? renderInvoiceForm(row, { defaultNumber: row.number }) : "";
    const canCopy = state === "live";
    const note =
        form && !canCopy
            ? `<p class="hint">this link is ${state}. extend or rotate to bring it back.</p>`
            : "";

    const body = `<main id="main" class="content admin">
    <header class="page-head">
        <div>
            <a class="back" href="/admin">&larr; invoices</a>
            <h1>#${escapeHtml(row.number)}</h1>
            <p class="muted">${escapeHtml(row.client_name)} / ${formatUsd(row.total_cents)}</p>
        </div>
        ${statusTag(status)}
    </header>
    <p id="msg" class="msg" role="status"></p>
    <section class="card" aria-labelledby="link-heading">
        ${chip("link", "invoice link", "link-heading")}
        <div class="link-row">
            <input class="input" id="invoice-link" aria-label="invoice link" readonly spellcheck="false" value="${escapeHtml(url)}">
            <button class="btn-secondary" type="button" data-copy="${escapeHtml(url)}"${canCopy ? "" : " disabled"}>copy link</button>
        </div>
        ${note}
        ${actionBar(row)}
    </section>
    ${form}
</main>`;

    return pageShell({
        title: `invoice #${row.number} / iflex0x`,
        nonce: opts.nonce,
        kind: "admin",
        body,
        footer: "site",
        scripts: ["/invoice/admin.js"],
        head: '<link rel="stylesheet" href="/invoice/admin.css">',
    });
}
