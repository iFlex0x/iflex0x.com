import { addDaysIso } from "./dates";
import { CONFIG } from "./config";
import type { StoredStatus } from "./status";

export const ACTIONS = [
    "paid",
    "open",
    "void",
    "restore",
    "extend",
    "rotate",
    "revoke",
    "unrevoke",
] as const;

export type InvoiceAction = (typeof ACTIONS)[number];

export type ActionState = {
    status: StoredStatus;
    paid_on: string | null;
    expires_on: string;
    revoked_at: string | null;
    token?: string;
};

export type ActionButton = {
    action: InvoiceAction;
    label: string;
};

export function availableActions(row: {
    status: StoredStatus;
    revoked_at: string | null;
}): ActionButton[] {
    const buttons: ActionButton[] = [];

    if (row.status === "open") buttons.push({ action: "paid", label: "mark paid" });
    if (row.status === "paid") buttons.push({ action: "open", label: "mark open" });

    if (row.status === "void") {
        buttons.push({ action: "restore", label: "restore" });
    } else {
        buttons.push(
            { action: "void", label: "void" },
            { action: "extend", label: `extend ${CONFIG.expiryDays} days` },
            { action: "rotate", label: "rotate link" },
        );
    }

    buttons.push(
        row.revoked_at === null
            ? { action: "revoke", label: "revoke" }
            : { action: "unrevoke", label: "unrevoke" },
    );

    return buttons;
}

export function nextState(
    row: ActionState,
    action: InvoiceAction,
    today: string,
    nowIso: string,
    newToken?: string,
): ActionState | null {
    switch (action) {
        case "paid":
            if (row.status !== "open") return null;
            return { ...row, status: "paid", paid_on: today };
        case "open":
            if (row.status !== "paid") return null;
            return { ...row, status: "open", paid_on: null };
        case "void":
            if (row.status === "void") return null;
            return { ...row, status: "void" };
        case "restore":
            if (row.status !== "void") return null;
            return { ...row, status: "open", paid_on: null };
        case "extend": {
            if (row.status === "void") return null;
            const next = addDaysIso(today, CONFIG.expiryDays);
            return { ...row, expires_on: next > row.expires_on ? next : row.expires_on };
        }
        case "rotate": {
            if (row.status === "void" || !newToken) return null;
            return {
                ...row,
                token: newToken,
                expires_on: addDaysIso(today, CONFIG.expiryDays),
                revoked_at: null,
            };
        }
        case "revoke":
            if (row.revoked_at !== null) return null;
            return { ...row, revoked_at: nowIso };
        case "unrevoke":
            if (row.revoked_at === null) return null;
            return { ...row, revoked_at: null };
    }
}
