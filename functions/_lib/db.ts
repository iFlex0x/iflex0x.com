import type { ActionState } from "./actions";
import type { InvoiceRow } from "./types";

export type NewInvoiceRow = {
    id: string;
    token: string;
    number: string;
    clientName: string;
    clientSub: string;
    clientLines: string;
    issuedOn: string;
    dueOn: string | null;
    body: string;
    totalCents: number;
    expiresOn: string;
    createdAt: string;
};

export type InvoiceUpdate = {
    number: string;
    clientName: string;
    clientSub: string;
    clientLines: string;
    issuedOn: string;
    dueOn: string | null;
    body: string;
    totalCents: number;
    updatedAt: string;
};

export type ActionPatch = ActionState & { updatedAt: string };

export function isUniqueNumberError(error: unknown): boolean {
    return String(error).includes("UNIQUE constraint failed: invoices.number");
}

export async function getByToken(db: D1Database, token: string): Promise<InvoiceRow | null> {
    return db.prepare("SELECT * FROM invoices WHERE token = ?").bind(token).first<InvoiceRow>();
}

export async function getById(db: D1Database, id: string): Promise<InvoiceRow | null> {
    return db.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first<InvoiceRow>();
}

export async function listInvoices(db: D1Database): Promise<InvoiceRow[]> {
    const result = await db.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all<InvoiceRow>();
    return result.results;
}

export async function nextNumber(db: D1Database, today: string): Promise<string> {
    const prefix = `${today.slice(0, 4)}-${today.slice(5, 7)}${today.slice(8, 10)}-`;
    const row = await db
        .prepare("SELECT number FROM invoices WHERE number LIKE ? ORDER BY number DESC LIMIT 1")
        .bind(`${prefix}%`)
        .first<{ number: string }>();
    const last = row?.number.slice(prefix.length) ?? "";
    const seq = /^\d+$/.test(last) ? Number(last) + 1 : 1;

    return `${prefix}${String(seq).padStart(2, "0")}`;
}

export async function insertInvoice(db: D1Database, row: NewInvoiceRow): Promise<void> {
    await db
        .prepare(
            `INSERT INTO invoices
                (id, token, number, client_name, client_sub, client_lines, issued_on, due_on,
                 status, paid_on, expires_on, revoked_at, body, total_cents, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, ?, NULL, ?, ?, ?, ?)`,
        )
        .bind(
            row.id,
            row.token,
            row.number,
            row.clientName,
            row.clientSub,
            row.clientLines,
            row.issuedOn,
            row.dueOn,
            row.expiresOn,
            row.body,
            row.totalCents,
            row.createdAt,
            row.createdAt,
        )
        .run();
}

export async function updateInvoice(db: D1Database, id: string, row: InvoiceUpdate): Promise<boolean> {
    const result = await db
        .prepare(
            `UPDATE invoices
             SET number = ?, client_name = ?, client_sub = ?, client_lines = ?, issued_on = ?,
                 due_on = ?, body = ?, total_cents = ?, updated_at = ?
             WHERE id = ? AND status = 'open'`,
        )
        .bind(
            row.number,
            row.clientName,
            row.clientSub,
            row.clientLines,
            row.issuedOn,
            row.dueOn,
            row.body,
            row.totalCents,
            row.updatedAt,
            id,
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
            patch.updatedAt,
            id,
            previous.status,
            previous.updated_at,
        )
        .run();

    return result.meta.changes > 0;
}
