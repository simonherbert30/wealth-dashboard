// Sync endpoint for the wealth dashboard.
// Stores ONE opaque, client-side-encrypted blob per key in Vercel Blob.
// The key is derived from the user's password in the browser (PBKDF2) —
// this server never sees the password or any readable financial data.

import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
  const key = String(req.query.k || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  if (key.length !== 64) {
    return res.status(400).json({ error: 'bad key' });
  }
  const pathname = `wealthdash/${key}.json`;

  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: pathname, limit: 1 });
      if (!blobs.length) return res.status(404).json({ error: 'not found' });
      const r = await fetch(blobs[0].url, { cache: 'no-store' });
      const text = await r.text();
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
      // sanity: must be the encrypted envelope, and not absurdly large
      if (body.length > 4_000_000) return res.status(413).json({ error: 'too large' });
      let parsed;
      try { parsed = JSON.parse(body); } catch { return res.status(400).json({ error: 'not json' }); }
      if (!parsed || parsed.v !== 2 || !parsed.ct || !parsed.iv || !parsed.s) {
        return res.status(400).json({ error: 'not an encrypted envelope' });
      }
      await put(pathname, body, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'storage unavailable' });
  }
}
