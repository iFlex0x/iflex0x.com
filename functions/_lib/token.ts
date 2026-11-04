const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function generateToken(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const binary = String.fromCharCode(...bytes);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isToken(value: string): boolean {
    return TOKEN_PATTERN.test(value);
}
