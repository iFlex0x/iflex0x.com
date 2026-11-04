export const CONFIG = {
    domain: "iflex0x.com",
    invoiceHost: "invoice.iflex0x.com",
    email: "ad@iflex0x.com",
    paypalHandle: "iflex8",
    expiryDays: 90,
    timeZone: "Europe/Copenhagen",
    fromLines: ["iflex0x", "Copenhagen, Denmark", "ad@iflex0x.com"],
};

export const SITE_URL = `https://${CONFIG.domain}`;
export const INVOICE_URL = `https://${CONFIG.invoiceHost}`;

export const LIMITS = {
    number: 40,
    clientName: 80,
    clientSub: 80,
    clientLines: 5,
    clientLine: 120,
    items: 20,
    itemTitle: 120,
    itemDesc: 300,
    discountLabel: 40,
    note: 1000,
    qtyHundredths: 100000,
    rateCents: 100000000,
    taxBp: 10000,
};
