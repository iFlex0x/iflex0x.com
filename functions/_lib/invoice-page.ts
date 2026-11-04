import { computeTotals, formatUsd, type InvoiceBody } from "./money";
import { formatDisplayDate } from "./dates";
import { shownStatus } from "./status";
import { escapeHtml, preserveLines } from "./html";
import { pageShell } from "./layout";
import { CONFIG } from "./config";
import type { InvoiceRow } from "./types";

export function renderInvoicePage(row: InvoiceRow, opts: { nonce: string; today: string }): string {
    const body = JSON.parse(row.body) as InvoiceBody;
    const lines = JSON.parse(row.client_lines) as string[];
    const totals = computeTotals(body);
    const status = shownStatus(row, opts.today);
    const paid = status === "paid";
    const voided = status === "void";
    const payable = !paid && !voided && totals.totalCents > 0;
    const payUrl = `https://paypal.me/${CONFIG.paypalHandle}/${(totals.totalCents / 100).toFixed(2)}USD`;

    const statusLabel = escapeHtml(status);
    const dueText = row.due_on ? formatDisplayDate(row.due_on) : "ON RECEIPT";
    const header = `<header class="doc-top">
    <img class="doc-logo" src="/logo.png" alt="iflex0x">
    <div class="doc-meta">
        <div class="kicker">invoice</div>
        <div class="doc-number">${escapeHtml(row.number)}</div>
        <div class="doc-dates">issued ${formatDisplayDate(row.issued_on)} / due ${dueText}</div>
        <div class="status" data-status="${statusLabel}">${statusLabel}</div>
    </div>
</header>`;

    const parties = `<div class="grid">
    <section class="card" aria-labelledby="from-heading">
        <h2 id="from-heading">from</h2>
        ${CONFIG.fromLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
    </section>
    <section class="card" aria-labelledby="bill-heading">
        <h2 id="bill-heading">bill to</h2>
        <div id="Z_Song">${escapeHtml(row.client_name)}</div>
        ${row.client_sub ? `<p>${escapeHtml(row.client_sub)}</p>` : ""}
        <p>${lines.map((line) => escapeHtml(line)).join("<br>")}</p>
    </section>
</div>`;

    const itemRows = body.items
        .map(
            (item) => `<tr>
    <td><strong>${escapeHtml(item.title)}</strong>${item.desc ? `<p>${escapeHtml(item.desc)}</p>` : ""}</td>
    <td>${(item.qtyHundredths / 100).toFixed(2).replace(/\.?0+$/, "")}</td>
    <td>${formatUsd(item.rateCents)}</td>
    <td>${formatUsd(Math.round((item.qtyHundredths * item.rateCents) / 100))}</td>
</tr>`,
        )
        .join("");

    const items = `<section class="card items" aria-labelledby="items-heading">
    <h2 id="items-heading">items</h2>
    <table>
        <caption class="skip">invoice items</caption>
        <thead><tr><th scope="col">item</th><th scope="col">qty</th><th scope="col">rate</th><th scope="col">amount</th></tr></thead>
        <tbody>${itemRows}</tbody>
    </table>
</section>`;

    const payment = voided
        ? ""
        : `<section class="card pay" aria-labelledby="pay-heading">
    <h2 id="pay-heading">payment</h2>
    ${paid ? `<p>paid on ${row.paid_on ? formatDisplayDate(row.paid_on) : ""}</p>` : ""}
    ${!paid && !payable ? `<p>no payment due.</p>` : ""}
    ${payable ? `<p class="payline">pay <a href="${payUrl}" target="_blank" rel="noopener noreferrer">${formatUsd(totals.totalCents)}</a> to ${CONFIG.email}</p>
    <p class="Z_Zulu">reference ${escapeHtml(row.number)}</p>
    <img class="qr" src="/invoice/qr.png" alt="PayPal QR code" width="240" height="240">
    <p><a class="paybtn" href="${payUrl}" target="_blank" rel="noopener noreferrer">pay ${formatUsd(totals.totalCents)}</a></p>
    <p class="Z_Zulu">the QR opens PayPal without an amount. the button carries the exact total.</p>` : ""}
</section>`;

    const totalsRows = [
        `<div class="row"><span>subtotal</span><span>${formatUsd(totals.subtotalCents)}</span></div>`,
        totals.discountCents > 0
            ? `<div class="row"><span>discount${body.discountLabel ? ` (${escapeHtml(body.discountLabel)})` : ""}</span><span>-${formatUsd(totals.discountCents)}</span></div>`
            : "",
        totals.taxCents > 0
            ? `<div class="row"><span>tax ${(body.taxBp / 100).toFixed(2).replace(/\.?0+$/, "")}%</span><span>${formatUsd(totals.taxCents)}</span></div>`
            : "",
        `<div class="row total"><span>total due</span><span>${formatUsd(totals.totalCents)}</span></div>`,
    ].join("");

    const totalsSection = `<section class="card totals" aria-labelledby="totals-heading">
    <h2 id="totals-heading">totals</h2>
    ${totalsRows}
</section>`;

    const notes = body.note
        ? `<section class="card notes" aria-labelledby="notes-heading"><h2 id="notes-heading">notes</h2><p>${preserveLines(body.note)}</p></section>`
        : "";

    return pageShell({
        title: "invoice / iFlex",
        nonce: opts.nonce,
        kind: "invoice",
        body: `<main id="main" class="doc">${header}${parties}${items}${payment}${totalsSection}${notes}</main>`,
        footer: "document",
        footerMeta: { number: row.number, expiry: formatDisplayDate(row.expires_on) },
        scripts: ["/invoice/invoice.js"],
        head: '<link rel="stylesheet" href="/invoice/invoice.css">',
    });
}