import type { VercelRequest, VercelResponse } from '@vercel/node';

// Cache en memoria para instancias calientes de serverless
const memoryStore = new Map<string, { data: unknown; timestamp: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS para permitir peticiones desde rotom.victormcl.me o localhost
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const syncKey = (req.query['key'] as string) || 'victor-rotom';

  // GET: Obtener datos sincronizados
  if (req.method === 'GET') {
    // 1. Revisar si hay un bucket o token externo configurado en Vercel
    const kvUrl = process.env['KV_REST_API_URL'];
    const kvToken = process.env['KV_REST_API_TOKEN'];

    if (kvUrl && kvToken) {
      try {
        const remoteRes = await fetch(`${kvUrl}/get/${syncKey}`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const json = await remoteRes.json();
        if (json && json.result) {
          const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
          res.status(200).json(parsed);
          return;
        }
      } catch (err) {
        console.error('Vercel KV fetch error:', err);
      }
    }

    // 2. Fallback memoria
    const cached = memoryStore.get(syncKey);
    if (cached) {
      res.status(200).json(cached.data);
      return;
    }

    res.status(200).json({ shopping: [], empty: true });
    return;
  }

  // POST: Guardar datos sincronizados
  if (req.method === 'POST') {
    const payload = req.body;

    // 1. Guardar en Vercel KV si está disponible
    const kvUrl = process.env['KV_REST_API_URL'];
    const kvToken = process.env['KV_REST_API_TOKEN'];

    if (kvUrl && kvToken) {
      try {
        await fetch(`${kvUrl}/set/${syncKey}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${kvToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('Vercel KV set error:', err);
      }
    }

    // 2. Guardar en memoria de instancia
    memoryStore.set(syncKey, {
      data: payload,
      timestamp: Date.now(),
    });

    res.status(200).json({ success: true, timestamp: new Date().toISOString() });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
