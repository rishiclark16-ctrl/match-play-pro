/**
 * Shared APNs helpers for edge functions.
 * Used by `send-push` (user-initiated) and `weekly-recap` (cron-initiated).
 */

export async function signApnsJwt(
  teamId: string,
  keyId: string,
  privateKeyPem: string,
): Promise<string> {
  const encoder = new TextEncoder();

  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const toBase64Url = (str: string) =>
    btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const headerB64 = toBase64Url(JSON.stringify(header));
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pem = privateKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const keyBytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(signingInput),
  );

  const sigB64 = toBase64Url(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  return `${signingInput}.${sigB64}`;
}

export const DEAD_TOKEN_REASONS = new Set([
  'BadDeviceToken',
  'Unregistered',
  'DeviceTokenNotForTopic',
  'TopicDisallowed',
]);

export function parseApnsReason(status: number, bodyText: string): string | null {
  if (status === 200) return null;
  try {
    const parsed = JSON.parse(bodyText);
    return typeof parsed?.reason === 'string' ? parsed.reason : null;
  } catch {
    return null;
  }
}

export function getApnsHost(isProduction: boolean): string {
  return isProduction
    ? 'https://api.push.apple.com'
    : 'https://api.sandbox.push.apple.com';
}
