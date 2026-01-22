/**
 * Generate Apple Client Secret JWT for Supabase
 *
 * Usage:
 *   node scripts/generate-apple-secret.js
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ YOUR CONFIG ============
const CONFIG = {
  teamId: 'YPMSN56J9D',
  keyId: 'ZPZ3C5C3K2',
  clientId: 'dev.matchgolf.app',
  privateKeyPath: path.join(__dirname, 'AuthKey_ZPZ3C5C3K2.p8'),
  expiresInSeconds: 15777000, // ~6 months
};
// =====================================

function generateAppleClientSecret() {
  let privateKey;
  try {
    privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8');
  } catch (err) {
    console.error('\n❌ Error: Could not read private key file.');
    console.error(`   Expected at: ${CONFIG.privateKeyPath}`);
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'ES256',
    kid: CONFIG.keyId,
    typ: 'JWT',
  };

  const payload = {
    iss: CONFIG.teamId,
    iat: now,
    exp: now + CONFIG.expiresInSeconds,
    aud: 'https://appleid.apple.com',
    sub: CONFIG.clientId,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sign = crypto.createSign('SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey);

  // Convert DER signature to raw r||s format for ES256
  const derSignature = signature;
  const rLength = derSignature[3];
  let rStart = 4;
  let rEnd = rStart + rLength;

  let r = derSignature.slice(rStart, rEnd);
  if (r[0] === 0 && r.length === 33) {
    r = r.slice(1);
  }

  const sLength = derSignature[rEnd + 1];
  let sStart = rEnd + 2;
  let sEnd = sStart + sLength;

  let s = derSignature.slice(sStart, sEnd);
  if (s[0] === 0 && s.length === 33) {
    s = s.slice(1);
  }

  while (r.length < 32) r = Buffer.concat([Buffer.from([0]), r]);
  while (s.length < 32) s = Buffer.concat([Buffer.from([0]), s]);

  const rawSignature = Buffer.concat([r, s]);
  const encodedSignature = rawSignature.toString('base64url');

  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

  console.log('\n✅ Apple Client Secret JWT generated!\n');
  console.log('━'.repeat(60));
  console.log('\nPaste this into Supabase → Auth → Apple → Secret Key:\n');
  console.log(jwt);
  console.log('\n' + '━'.repeat(60));
  console.log(`\n⏰ Expires: ${new Date((now + CONFIG.expiresInSeconds) * 1000).toLocaleDateString()}\n`);

  return jwt;
}

generateAppleClientSecret();
