import type { InvoiceAction } from "./actions";
import type { StoredStatus } from "./status";

export type { InvoiceAction, StoredStatus };

export interface Env {
    INVOICES_DB: D1Database;
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
    total_cents: number;
    created_at: string;
    updated_at: string;
};