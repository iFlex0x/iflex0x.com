import { CONFIG } from "./config";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function todayIso(now: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: CONFIG.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);
}

export function addDaysIso(iso: string, days: number): string {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

export function formatDisplayDate(iso: string): string {
    const [year, month, day] = iso.split("-");
    return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function isExpired(expiresOn: string, today: string): boolean {
    return expiresOn < today;
}

export function isOverdue(dueOn: string | null, today: string): boolean {
    return dueOn !== null && dueOn < today;
}
