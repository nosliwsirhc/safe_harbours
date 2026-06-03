// Certificate-based app-only token for the SharePoint REST resource.
// SharePoint REST (_api) REJECTS Azure AD app-only tokens obtained with a client SECRET
// ("Unsupported app only token", appidacr=1); it requires a CERTIFICATE-signed client
// assertion (appidacr=2). Lifted from the FileDrop project (functions/lib/spcert.ts),
// which proved this on the same tenant.
import type { Env } from './types';

const b64url = (bytes: ArrayBuffer | Uint8Array): string => {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]!);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlStr = (s: string): string => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let spCache: { token: string; exp: number } | null = null;

/** App-only SharePoint-REST token via the Writer app's certificate (cached per isolate). */
export async function getSpToken(env: Env): Promise<string> {
  if (spCache && spCache.exp > Date.now() + 60_000) return spCache.token;
  if (!env.WRITER_CERT_PRIVATE_KEY || !env.WRITER_CERT_THUMBPRINT) {
    throw new Error('SharePoint cert not configured (WRITER_CERT_PRIVATE_KEY + WRITER_CERT_THUMBPRINT)');
  }
  const tokenEndpoint = `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`;
  const now = Math.floor(Date.now() / 1000);

  // x5t = base64url of the cert SHA-1 thumbprint bytes.
  const x5t = b64url(hexToBytes(env.WRITER_CERT_THUMBPRINT));
  const header = b64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT', x5t }));
  const payload = b64urlStr(JSON.stringify({
    aud: tokenEndpoint,
    iss: env.WRITER_CLIENT_ID,
    sub: env.WRITER_CLIENT_ID,
    jti: crypto.randomUUID(),
    nbf: now,
    iat: now,
    exp: now + 300,
  }));
  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(env.WRITER_CERT_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${b64url(sig)}`;

  const body = new URLSearchParams({
    client_id: env.WRITER_CLIENT_ID,
    scope: `https://${env.SHAREPOINT_HOSTNAME}/.default`,
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: assertion,
  });
  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`SP cert token failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  spCache = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}
