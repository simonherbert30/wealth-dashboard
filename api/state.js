// Sync endpoint for the wealth dashboard — PRIVATE Vercel Blob store.
// Stores ONE opaque, client-side-encrypted blob per key. The key is derived
// from the user's password in the browser (PBKDF2) — this server never sees
// the password or any readable financial data. With a private store, blobs
// are not reachable by URL at all; every read/write is authenticated
// (OIDC or BLOB_READ_WRITE_TOKEN, handled by the SDK automatically).

import { put, get } from '@vercel/blob';

async function bodyText(result) {
  if (!result) return null;
  if (typeof result.text === 'function') return await result.text();
  if (result.body) {
    const chunks = [];
    for await (const c of result.body) chunks.push(Buffer.from(c));
    return Buffer.concat(chunks).toString('utf8');
  }
  return null;
}

export default async function handler(req, res) {
  const key = String(req.query.k || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  if (key.length !== 64) {
    return res.status(400).json({ error: 'bad key' });
  }
  const pathname = `wealthdash/${key}.json`;

  try {
    if (req.method === 'GET') {
      let result;
      try {
        result = await get(pathname, { access: 'private', useCache: false });
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (/not.?found|does not exist|404/i.test(msg)) {
          return res.status(404).json({ error: 'not found' });
        }
        throw e;
      }
      const text = await bodyText(result);
      if (text == null) return res.status(404).json({ error: 'not found' });
      res.setHeader('content-type', 'application/json');
      res.setHeader('cache-control', 'no-store');
      return res.status(200).send(text);
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      let body = req.body;
      if (body == null) {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        body = raw;
      }
      if (typeof body !== 'string') body = JSON.stringify(body);
      if (body.length > 4_000_000) return res.status(413).json({ error: 'too large' });
      let parsed;
      try { parsed = JSON.parse(body); } catch { return res.status(400).json({ error: 'not json' }); }
      if (!parsed || parsed.v !== 2 || !parsed.ct || !parsed.iv || !parsed.s) {
        return res.status(400).json({ error: 'not an encrypted envelope' });
      }
      await put(pathname, body, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 60,
      });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'storage unavailable', detail: String((e && e.message) || e) });
  }
}
