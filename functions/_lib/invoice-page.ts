import { itemAmountCents, formatNumber, formatUsd } from "./money";
import { formatDisplayDate } from "./dates";
import { shownStatus } from "./status";
import { escapeHtml } from "./html";
import { renderMarkdown } from "./markdown";
import { pageShell } from "./layout";
import { CONFIG, SITE_URL, INVOICE_URL } from "./config";
import { invoiceHead } from "./embed";
import { parseBody, parseLines } from "./db";
import { chip, statusTag } from "./ui";
import { qrSvg } from "./qr";
import type { InvoiceRow } from "./types";

export function renderInvoicePage(row: InvoiceRow, opts: { nonce: string; today: string }): string {
    const body = parseBody(row);
    const lines = parseLines(row);
    const status = shownStatus(row, opts.today);
    const paid = status === "paid";
    const voided = status === "void";
    const payable = !paid && !voided && row.total_cents > 0;
    const payUrl = `https://paypal.me/${CONFIG.paypalHandle}/${(row.total_cents / 100).toFixed(2)}USD`;
    const dueText = row.due_on ? formatDisplayDate(row.due_on) : "on receipt";

    const header = `<header class="doc-top">
    <img class="doc-logo" src="/logo.png" alt="iflex0x">
    <div class="doc-meta">
        <div class="kicker">invoice</div>
        <h1 class="doc-number">#${escapeHtml(row.number)}</h1>
        <div class="doc-dates">issued ${formatDisplayDate(row.issued_on)} / due ${dueText}</div>
        ${statusTag(status)}
    </div>
</header>`;

    const parties = `<div class="doc-grid">
    <section class="card doc-from" aria-labelledby="from-heading">
        ${chip("palette", "from", "from-heading")}
        <div class="name">${escapeHtml(CONFIG.fromName)}</div>
        <div class="sub">${escapeHtml(CONFIG.fromSub)}</div>
        <div class="line">
            <a href="${escapeHtml(SITE_URL)}">${escapeHtml(CONFIG.domain)}</a>
            <a href="mailto:${escapeHtml(CONFIG.email)}">${escapeHtml(CONFIG.email)}</a>
        </div>
    </section>
    <section class="card" aria-labelledby="bill-heading">
        ${chip("user", "bill to", "bill-heading")}
        <div class="name">${renderMarkdown(row.client_name)}</div>
        ${row.client_sub ? `<div class="sub">${renderMarkdown(row.client_sub)}</div>` : ""}
        ${lines.length ? `<div class="line">${lines.map((line) => `<span>${renderMarkdown(line)}</span>`).join("")}</div>` : ""}
    </section>
</div>`;

    const itemRows = body.items
        .map(
            (item) => `<tr>
    <td>
        <div class="t">${renderMarkdown(item.title)}</div>
        ${item.desc ? `<div class="d">${renderMarkdown(item.desc)}</div>` : ""}
    </td>
    <td class="r m">${formatNumber(item.qtyHundredths)}</td>
    <td class="r m rate">${formatUsd(item.rateCents)}</td>
    <td class="r m amt">${formatUsd(itemAmountCents(item.qtyHundredths, item.rateCents))}</td>
</tr>`,
        )
        .join("");

    const items = `<section class="card items" aria-labelledby="items-heading">
    ${chip("list", "items", "items-heading")}
    <table>
        <caption class="sr">invoice items</caption>
        <thead>
            <tr>
                <th scope="col">description</th>
                <th class="r" scope="col">qty</th>
                <th class="r rate" scope="col">rate</th>
                <th class="r" scope="col">amount</th>
            </tr>
        </thead>
        <tbody>${itemRows}</tbody>
    </table>
</section>`;

    const paylines = `<div class="payline"><b>PayPal</b><br><a href="${escapeHtml(payUrl)}" target="_blank" rel="noopener noreferrer">paypal.me/${escapeHtml(CONFIG.paypalHandle)}</a></div>
        <div class="payline"><b>Email</b><br><a href="mailto:${escapeHtml(CONFIG.email)}">${escapeHtml(CONFIG.email)}</a></div>
        <div class="payline"><b>Due</b> ${dueText}</div>
        <div class="payline"><b>Reference</b> ${escapeHtml(row.number)}</div>`;

    let paymentBody: string;
    if (paid) {
        paymentBody = `<div class="pay-grid">
        <div>
            <div class="payline"><b>Paid</b> ${formatDisplayDate(row.paid_on!)}</div>
            <div class="payline"><b>PayPal</b><br>paypal.me/${escapeHtml(CONFIG.paypalHandle)}</div>
            <div class="payline"><b>Email</b><br><a href="mailto:${escapeHtml(CONFIG.email)}">${escapeHtml(CONFIG.email)}</a></div>
            <div class="payline"><b>Reference</b> ${escapeHtml(row.number)}</div>
        </div>
    </div>`;
    } else if (voided) {
        paymentBody = `<p class="muted">no payment due. this invoice is void.</p>`;
    } else if (payable) {
        paymentBody = `<div class="pay-grid">
        <div>
            ${paylines}
            <a class="paybtn" href="${escapeHtml(payUrl)}" target="_blank" rel="noopener noreferrer">pay ${formatUsd(row.total_cents)}</a>
        </div>
        ${qrSvg(payUrl)}
    </div>`;
    } else {
        paymentBody = `<p class="muted">no payment due.</p>`;
    }

    const payment = `<section class="card pay" aria-labelledby="pay-heading">
    ${chip("card", "payment", "pay-heading")}
    ${paymentBody}
</section>`;

    const totalsRows = [
        `<div class="trow"><span>subtotal</span><span class="m">${formatUsd(row.subtotal_cents)}</span></div>`,
        row.discount_cents > 0
            ? `<div class="trow"><span>discount${body.discountLabel ? ` (${renderMarkdown(body.discountLabel)})` : ""}</span><span class="m">-${formatUsd(row.discount_cents)}</span></div>`
            : "",
        row.tax_cents > 0
            ? `<div class="trow"><span>tax (${formatNumber(body.taxBp)}%)</span><span class="m">${formatUsd(row.tax_cents)}</span></div>`
            : "",
        `<div class="trow total"><span class="k">${paid ? "total paid" : "total due"}</span><span class="v">${formatUsd(row.total_cents)}</span></div>`,
    ].join("");

    const totals = `<section class="card totals" aria-labelledby="totals-heading">
    ${chip("calculator", "totals", "totals-heading")}
    ${totalsRows}
</section>`;

    const notes = body.note
        ? `<section class="card notes" aria-labelledby="notes-heading">
    ${chip("pencil", "notes", "notes-heading")}
    <p>${renderMarkdown(body.note)}</p>
</section>`
        : "";

    return pageShell({
        title: `invoice #${row.number} / iflex0x`,
        nonce: opts.nonce,
        kind: "invoice",
        body: `<main id="main" class="doc">${header}${parties}${items}<div class="doc-bottom">${payment}${totals}</div>${notes}</main>`,
        footer: "document",
        footerMeta: { number: row.number, expiry: formatDisplayDate(row.expires_on) },
        scripts: ["/invoice/invoice.js"],
        head: `<link rel="stylesheet" href="/invoice/invoice.css">
${invoiceHead(`${INVOICE_URL}/i/${row.token}`)}`,
    });
}
