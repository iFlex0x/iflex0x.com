CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE CHECK (length(token) = 22),
    number TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    client_sub TEXT NOT NULL DEFAULT '',
    client_lines TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(client_lines)),
    issued_on TEXT NOT NULL,
    due_on TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'void')),
    paid_on TEXT,
    expires_on TEXT NOT NULL,
    revoked_at TEXT,
    body TEXT NOT NULL CHECK (json_valid(body)),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_expires_on ON invoices(expires_on);