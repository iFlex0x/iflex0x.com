export function getCache(): Cache {
    return (caches as unknown as { default: Cache }).default;
}
