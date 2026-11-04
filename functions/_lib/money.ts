export type ItemInput = {
    title: string;
    desc: string;
    qtyHundredths: number;
    rateCents: number;
};

export type InvoiceBody = {
    items: ItemInput[];
    discountCents: number;
    discountLabel: string;
    taxBp: number;
    note: string;
};

export type Totals = {
    subtotalCents: number;
    discountCents: number;
    taxableCents: number;
    taxCents: number;
    totalCents: number;
};

export function itemAmountCents(qtyHundredths: number, rateCents: number): number {
    return Math.round((qtyHundredths * rateCents) / 100);
}

export function computeTotals(body: InvoiceBody): Totals {
    const subtotalCents = body.items.reduce(
        (sum, item) => sum + itemAmountCents(item.qtyHundredths, item.rateCents),
        0,
    );
    const discountCents = Math.min(Math.max(0, body.discountCents), subtotalCents);
    const taxableCents = subtotalCents - discountCents;
    const taxCents = Math.round((taxableCents * body.taxBp) / 10000);

    return { subtotalCents, discountCents, taxableCents, taxCents, totalCents: taxableCents + taxCents };
}

export function formatUsd(cents: number): string {
    const negative = cents < 0;
    const abs = Math.abs(cents);
    const dollars = Math.floor(abs / 100);
    const rest = String(abs % 100).padStart(2, "0");
    const grouped = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return `${negative ? "-" : ""}$${grouped}.${rest}`;
}