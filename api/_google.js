// Sign in with Google: checks the ID token Google gives the browser. No Google API keys or secrets are needed,
// only the public client ID (GOOGLE_CLIENT_ID).
import crypto from "node:crypto";

let certCache = { at: 0, keys: [] };
export async function googleCerts() {
  if (Date.now() - certCache.at < 3600e3 && certCache.keys.length) return certCache.keys;
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs"); if (!r.ok) throw new Error("Could not reach Google.");
  certCache = { at: Date.now(), keys: (await r.json()).keys || [] }; return certCache.keys;
}
export async function verifyGoogleToken(token, clientId, getKeys = googleCerts) {
  const parts = String(token || "").split("."); if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url")); const payload = JSON.parse(Buffer.from(parts[1], "base64url"));
    if (header.alg !== "RS256") return null;
    const jwk = (await getKeys()).find(k => k.kid === header.kid); if (!jwk) return null;
    const ok = crypto.verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), crypto.createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(parts[2], "base64url"));
    if (!ok) return null;
    if (!["accounts.google.com", "https://accounts.google.com"].includes(payload.iss)) return null;
    if (payload.aud !== clientId || !payload.sub || payload.exp * 1000 < Date.now() || payload.email_verified === false) return null;
    return payload;
  } catch { return null; }
}
export const cleanUsernameFrom = (email, name) => {
  let b = String(email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, ""); if (b.length < 3) b = String(name || "").toLowerCase().replace(/[^a-z0-9_]/g, ""); if (b.length < 3) b = "friend" + b;
  return b.slice(0, 14);
};
