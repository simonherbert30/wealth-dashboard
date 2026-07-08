// Sync endpoint for the wealth dashboard — private Vercel Blob store.
// One opaque, client-side-encrypted blob per key; the server never sees
// the password or readable data. Namespace import + runtime feature
// detection so no SDK version difference can crash the function.

import * as blob from '@vercel/blob';

function authToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN || '';
}

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

async function readBlob(pathname) {
  // Preferred: SDK get() (private-store aware, cache-bypassing)
  if (typeof blob.get === 'function') {
    try {
      const result = await blob.get(pathname, { access: 'private', useCache: false });
      const text = await bodyText(result);
      return text == null ? { status: 404 } : { status: 200, text };
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (/not.?found|does not exist|404/i.test(msg)) return { status: 404 };
      throw e;
    }
  }
  // Fallback: locate via list(), fetch with Authorization header
  const { blobs } = await blob.list({ prefix: pathname, limit: 1 });
  if (!blobs.length) return { status: 404 };
  const r = await fetch(blobs[0].url, {
    cache: 'no-store',
    headers: { authorization: 'Bearer ' + authToken() },
  });
  if (r.status === 404) return { status: 404 };
  if (!r.ok) throw new Error('blob fetch failed: ' + r.status);
  return { status: 200, text: await r.text() };
}

async function writeBlob(pathname, body) {
  const base = { addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 };
  try {
    return await blob.put(pathname, body, Object.assign({ access: 'private' }, base));
  } catch (e) {
    const msg = String((e && e.message) || e);
    // Older SDKs only accept access:'public'; public stores reject 'private'.
    if (/access/i.test(msg) && /private|public|invalid/i.test(msg)) {
      return await blob.put(pathname, body, Object.assign({ access: 'public' }, base));
    }
    throw e;
  }
}

export default async function handler(req, res) {
  const key = String(req.query.k || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  if (key.length !== 64) return res.status(400).json({ error: 'bad key' });
  const pathname = `wealthdash/${key}.json`;

  try {
    if (req.method === 'GET') {
      const out = await readBlob(pathname);
      if (out.status === 404) return res.status(404).json({ error: 'not found' });
      res.setHeader('content-type', 'application/json');
      res.setHeader('cache-control', 'no-store');
      return res.status(200).send(out.text);
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
      await writeBlob(pathname, body);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'storage unavailable', detail: String((e && e.message) || e) });
  }
}
