import type { StoredStatus } from "./status";

export interface Env {
    INVOICES_DB: D1Database;
    Z_LISTEN: KVNamespace;
    ACCESS_TEAM_DOMAIN: string;
    ACCESS_AUD: string;
    ADMIN_EMAIL: string;
    ENVIRONMENT: string;
    DEV_BYPASS_ACCESS?: string;
}

export type AdminData = { email: string };

export type InvoiceRow = {
    id: string;
    token: string;
    number: string;
    client_name: string;
    client_sub: string;
    client_lines: string;
    issued_on: string;
    due_on: string | null;
    status: StoredStatus;
    paid_on: string | null;
    expires_on: string;
    revoked_at: string | null;
    body: string;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
    created_at: string;
    updated_at: string;
};

export type InvoiceListRow = Pick<
    InvoiceRow,
    | "id"
    | "token"
    | "number"
    | "client_name"
    | "status"
    | "due_on"
    | "expires_on"
    | "revoked_at"
    | "total_cents"
>;
