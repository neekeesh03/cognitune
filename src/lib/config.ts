let cfg: Promise<{ resetEnabled: boolean }> | null = null;
/** Server switches: does password reset by email work yet? */
export const resetEnabled = () => (cfg ||= fetch("/api/config").then(r => r.json()).then(j => ({ resetEnabled: !!j.resetEnabled })).catch(() => ({ resetEnabled: false }))).then(c => c.resetEnabled);
