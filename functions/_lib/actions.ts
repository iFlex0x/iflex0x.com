import { addDaysIso } from "./dates";
import { CONFIG } from "./config";
import type { StoredStatus } from "./status";

export type InvoiceAction = "paid" | "open" | "void" | "restore" | "extend" | "rotate" | "revoke" | "unrevoke";

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
    variant: "btn" | "btn-secondary" | "btn-danger";
};

export function availableActions(row: { status: StoredStatus; revoked_at: string | null }): ActionButton[] {
    const buttons: ActionButton[] = [];

    if (row.status === "open") buttons.push({ action: "paid", label: "mark paid", variant: "btn" });
    if (row.status === "paid") buttons.push({ action: "open", label: "mark open", variant: "btn" });

    if (row.status === "void") {
        buttons.push({ action: "restore", label: "restore", variant: "btn" });
    } else {
        buttons.push(
            { action: "void", label: "void", variant: "btn-secondary" },
            { action: "extend", label: `extend ${CONFIG.expiryDays} days`, variant: "btn-secondary" },
            { action: "rotate", label: "rotate link", variant: "btn-danger" },
        );
    }

    buttons.push(
        row.revoked_at === null
            ? { action: "revoke", label: "revoke", variant: "btn-danger" }
            : { action: "unrevoke", label: "unrevoke", variant: "btn-secondary" },
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
    const base: ActionState = { ...row };

    switch (action) {
        case "paid":
            if (row.status !== "open") return null;
            return { ...base, status: "paid", paid_on: today };
        case "open":
            if (row.status !== "paid") return null;
            return { ...base, status: "open", paid_on: null };
        case "void":
            if (row.status === "void") return null;
            return { ...base, status: "void" };
        case "restore":
            if (row.status !== "void") return null;
            return { ...base, status: "open", paid_on: null };
        case "extend": {
            if (row.status === "void") return null;
            const next = addDaysIso(today, CONFIG.expiryDays);
            return { ...base, expires_on: next > row.expires_on ? next : row.expires_on };
        }
        case "rotate": {
            if (row.status === "void" || !newToken) return null;
            return { ...base, token: newToken, expires_on: addDaysIso(today, CONFIG.expiryDays), revoked_at: null };
        }
        case "revoke":
            return { ...base, revoked_at: nowIso };
        case "unrevoke":
            return { ...base, revoked_at: null };
    }
}
