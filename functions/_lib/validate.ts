import { computeTotals, type InvoiceBody, type Totals } from "./money";

export const MAX_BODY_BYTES = 65536;

export type NormalizedInvoice = {
    number: string;
    clientName: string;
    clientSub: string;
    clientLines: string[];
    issuedOn: string;
    dueOn: string | null;
    body: InvoiceBody;
    totals: Totals;
};

export type ParseResult = { ok: true; value: NormalizedInvoice } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

function text(value: unknown): string | null {
    return typeof value === "string" ? value.trim() : null;
}

function decimal(value: unknown): number | null {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const raw = String(value).trim();
    if (!DECIMAL_RE.test(raw)) return null;
    const [whole, fraction = ""] = raw.split(".");
    const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

    return Number.isSafeInteger(amount) ? amount : null;
}

function isDate(iso: string): boolean {
    if (!DATE_RE.test(iso)) return false;
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === iso;
}

function fail(error: string): ParseResult {
    return { ok: false, error };
}

export function parseInvoicePayload(raw: unknown): ParseResult {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fail("invalid payload");
    const input = raw as Record<string, unknown>;

    const number = text(input.number);
    if (!number || number.length > 40) return fail("invalid invoice number");

    const clientName = text(input.clientName);
    if (!clientName || clientName.length > 80) return fail("invalid client name");

    const clientSub = text(input.clientSub) ?? "";
    if (clientSub.length > 80) return fail("client sub is too long");

    if (!Array.isArray(input.clientLines) || input.clientLines.length > 5) return fail("invalid client lines");
    const clientLines: string[] = [];
    for (const line of input.clientLines) {
        const value = text(line);
        if (value === null || value.length > 120) return fail("invalid client line");
        if (value !== "") clientLines.push(value);
    }

    const issuedOn = text(input.issuedOn);
    if (!issuedOn || !isDate(issuedOn)) return fail("invalid issue date");

    const rawDue = input.dueOn;
    const dueOn = rawDue === null || rawDue === undefined || rawDue === "" ? null : text(rawDue);
    if (dueOn !== null && (!isDate(dueOn) || dueOn < issuedOn)) return fail("invalid due date");

    if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) {
        return fail("invalid item count");
    }

    const items: InvoiceBody["items"] = [];
    for (const entry of input.items) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return fail("invalid item");
        const item = entry as Record<string, unknown>;
        const title = text(item.title);
        if (!title || title.length > 120) return fail("invalid item title");
        const desc = text(item.desc) ?? "";
        if (desc.length > 300) return fail("item description is too long");
        const qtyHundredths = decimal(item.qty);
        if (qtyHundredths === null || qtyHundredths < 1 || qtyHundredths > 100000) return fail("invalid quantity");
        const rateCents = decimal(item.rate);
        if (rateCents === null || rateCents < 0 || rateCents > 100000000) return fail("invalid rate");
        items.push({ title, desc, qtyHundredths, rateCents });
    }

    const discountCents = decimal(input.discount ?? "0");
    if (discountCents === null || discountCents < 0) return fail("invalid discount");
    const discountLabel = text(input.discountLabel) ?? "";
    if (discountLabel.length > 40) return fail("discount label is too long");

    const taxBp = decimal(input.taxRate ?? "0");
    if (taxBp === null || taxBp < 0 || taxBp > 10000) return fail("invalid tax rate");

    const note = text(input.note) ?? "";
    if (note.length > 1000) return fail("note is too long");

    const body: InvoiceBody = { items, discountCents, discountLabel, taxBp, note };
    const totals = computeTotals(body);
    if (discountCents > totals.subtotalCents) return fail("discount is larger than subtotal");

    return {
        ok: true,
        value: { number, clientName, clientSub, clientLines, issuedOn, dueOn, body, totals },
    };
}
