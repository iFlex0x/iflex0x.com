import type { ActionState } from "./actions";
import type { InvoiceBody } from "./money";
import type { InvoiceListRow, InvoiceRow } from "./types";

export type NewInvoiceRow = {
    id: string;
    token: string;
    number: string;
    client_name: string;
    client_sub: string;
    client_lines: string;
    issued_on: string;
    due_on: string | null;
    body: string;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
    expires_on: string;
    created_at: string;
};

export type InvoiceUpdate = {
    number: string;
    client_name: string;
    client_sub: string;
    client_lines: string;
    issued_on: string;
    due_on: string | null;
    body: string;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
    updated_at: string;
};

export type ActionPatch = ActionState & { updated_at: string };

const ROW_COLUMNS =
    "id, token, number, client_name, client_sub, client_lines, issued_on, due_on, status, paid_on, expires_on, revoked_at, body, subtotal_cents, discount_cents, tax_cents, total_cents, created_at, updated_at";

const LIST_COLUMNS =
    "id, token, number, client_name, status, due_on, expires_on, revoked_at, total_cents";

export function isUniqueNumberError(error: unknown): boolean {
    return String(error).includes("UNIQUE constraint failed: invoices.number");
}

export function parseBody(row: { body: string }): InvoiceBody {
    const parsed: unknown = JSON.parse(row.body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("invalid invoice body");
    return parsed as InvoiceBody;
}

export function parseLines(row: { client_lines: string }): string[] {
    const parsed: unknown = JSON.parse(row.client_lines);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line): line is string => typeof line === "string");
}

export async function getByToken(db: D1Database, token: string): Promise<InvoiceRow | null> {
    return db
        .prepare(`SELECT ${ROW_COLUMNS} FROM invoices WHERE token = ?`)
        .bind(token)
        .first<InvoiceRow>();
}

export async function getById(db: D1Database, id: string): Promise<InvoiceRow | null> {
    return db
        .prepare(`SELECT ${ROW_COLUMNS} FROM invoices WHERE id = ?`)
        .bind(id)
        .first<InvoiceRow>();
}

export async function listInvoices(db: D1Database): Promise<InvoiceListRow[]> {
    const result = await db
        .prepare(`SELECT ${LIST_COLUMNS} FROM invoices ORDER BY created_at DESC`)
        .all<InvoiceListRow>();
    return result.results;
}

export async function nextNumber(db: D1Database, today: string): Promise<string> {
    const prefix = `${today.slice(0, 4)}-${today.slice(5, 7)}${today.slice(8, 10)}-`;
    const result = await db
        .prepare("SELECT number FROM invoices WHERE number LIKE ?")
        .bind(`${prefix}%`)
        .all<{ number: string }>();
    let max = 0;
    for (const row of result.results) {
        if (!row.number.startsWith(prefix)) continue;
        const seq = Number(row.number.slice(prefix.length));
        if (Number.isInteger(seq) && seq > max) max = seq;
    }
    return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

export async function insertInvoice(db: D1Database, row: NewInvoiceRow): Promise<void> {
    await db
        .prepare(
            `INSERT INTO invoices
                (id, token, number, client_name, client_sub, client_lines, issued_on, due_on,
                 status, paid_on, expires_on, revoked_at, body, subtotal_cents, discount_cents,
                 tax_cents, total_cents, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
            row.id,
            row.token,
            row.number,
            row.client_name,
            row.client_sub,
            row.client_lines,
            row.issued_on,
            row.due_on,
            row.expires_on,
            row.body,
            row.subtotal_cents,
            row.discount_cents,
            row.tax_cents,
            row.total_cents,
            row.created_at,
            row.created_at,
        )
        .run();
}

export async function updateInvoice(
    db: D1Database,
    id: string,
    row: InvoiceUpdate,
    expectedUpdatedAt: string,
): Promise<boolean> {
    const result = await db
        .prepare(
            `UPDATE invoices
             SET number = ?, client_name = ?, client_sub = ?, client_lines = ?, issued_on = ?,
                 due_on = ?, body = ?, subtotal_cents = ?, discount_cents = ?, tax_cents = ?,
                 total_cents = ?, updated_at = ?
             WHERE id = ? AND status = 'open' AND updated_at = ?`,
        )
        .bind(
            row.number,
            row.client_name,
            row.client_sub,
            row.client_lines,
            row.issued_on,
            row.due_on,
            row.body,
            row.subtotal_cents,
            row.discount_cents,
            row.tax_cents,
            row.total_cents,
            row.updated_at,
            id,
            expectedUpdatedAt,
        )
        .run();
    return result.meta.changes > 0;
}

export async function updateAction(
    db: D1Database,
    id: string,
    patch: ActionPatch,
    previous: { status: string; updated_at: string },
): Promise<boolean> {
    const result = await db
        .prepare(
            `UPDATE invoices
             SET status = ?, paid_on = ?, expires_on = ?, revoked_at = ?, token = COALESCE(?, token), updated_at = ?
             WHERE id = ? AND status = ? AND updated_at = ?`,
        )
        .bind(
            patch.status,
            patch.paid_on,
            patch.expires_on,
            patch.revoked_at,
            patch.token ?? null,
            patch.updated_at,
            id,
            previous.status,
            previous.updated_at,
        )
        .run();
    return result.meta.changes > 0;
}
