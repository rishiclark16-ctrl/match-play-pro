// Minimal App Store Connect API client (no dependencies).
// Auth: ES256 JWT from ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_P8 (or ASC_KEY_P8_BASE64).
import { createPrivateKey, sign, createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const BASE = 'https://api.appstoreconnect.apple.com';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

export function makeToken(env = process.env, now = Math.floor(Date.now() / 1000)) {
  const keyId = env.ASC_KEY_ID;
  const issuer = env.ASC_ISSUER_ID;
  let p8 = (env.ASC_KEY_P8 || '').trim();
  if (!p8 && env.ASC_KEY_P8_BASE64) p8 = Buffer.from(env.ASC_KEY_P8_BASE64, 'base64').toString('utf8');
  if (!keyId || !issuer || !p8.includes('PRIVATE KEY')) {
    throw new Error('Set ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_P8 (the .p8 text).');
  }
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: issuer, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' }));
  const data = `${header}.${payload}`;
  const sig = sign('sha256', Buffer.from(data), { key: createPrivateKey(p8), dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64url(sig)}`;
}

export class Asc {
  constructor(env = process.env) {
    this.env = env;
    this.token = null;
    this.tokenAt = 0;
  }

  auth() {
    const now = Math.floor(Date.now() / 1000);
    if (!this.token || now - this.tokenAt > 10 * 60) {
      this.token = makeToken(this.env, now);
      this.tokenAt = now;
    }
    return `Bearer ${this.token}`;
  }

  async req(method, path, body) {
    const url = path.startsWith('http') ? path : BASE + path;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method,
        headers: { Authorization: this.auth(), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
        continue;
      }
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const detail = json?.errors?.map((e) => `${e.title}: ${e.detail}`).join('; ') || text;
        throw new Error(`${method} ${path} → ${res.status} ${detail}`);
      }
      return json;
    }
  }

  get = (p) => this.req('GET', p);
  post = (p, b) => this.req('POST', p, b);
  patch = (p, b) => this.req('PATCH', p, b);
  del = (p) => this.req('DELETE', p);

  /** Follows `links.next` and returns every item. */
  async all(path) {
    const out = [];
    let next = path;
    while (next) {
      const page = await this.get(next);
      out.push(...(page.data || []));
      next = page.links?.next || null;
    }
    return out;
  }

  async appId(bundleId) {
    const res = await this.get(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`);
    const app = res.data?.[0];
    if (!app) throw new Error(`No app with bundle id ${bundleId}`);
    return app.id;
  }

  /** Uploads one screenshot into a screenshot set (reserve → PUT parts → commit). */
  async uploadScreenshot(setId, file) {
    const bytes = readFileSync(file);
    const reserved = await this.post('/v1/appScreenshots', {
      data: {
        type: 'appScreenshots',
        attributes: { fileName: basename(file), fileSize: statSync(file).size },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
      },
    });
    const shot = reserved.data;
    for (const op of shot.attributes.uploadOperations) {
      const headers = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]));
      const part = bytes.subarray(op.offset, op.offset + op.length);
      const res = await fetch(op.url, { method: op.method, headers, body: part });
      if (!res.ok) throw new Error(`Upload of ${basename(file)} failed: ${res.status}`);
    }
    await this.patch(`/v1/appScreenshots/${shot.id}`, {
      data: {
        type: 'appScreenshots',
        id: shot.id,
        attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(bytes).digest('hex') },
      },
    });
    return shot.id;
  }
}
