import { isExpired, isOverdue } from "./dates";

export type StoredStatus = "open" | "paid" | "void";
export type ShownStatus = "due" | "overdue" | "paid" | "void";
export type LinkState = "live" | "expired" | "revoked";

export function linkState(
    row: { expires_on: string; revoked_at: string | null },
    today: string,
): LinkState {
    if (row.revoked_at !== null) return "revoked";
    if (isExpired(row.expires_on, today)) return "expired";
    return "live";
}

export function shownStatus(
    row: { status: StoredStatus; due_on: string | null },
    today: string,
): ShownStatus {
    if (row.status === "paid") return "paid";
    if (row.status === "void") return "void";
    if (isOverdue(row.due_on, today)) return "overdue";
    return "due";
}
