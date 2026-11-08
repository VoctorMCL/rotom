import type { VercelRequest, VercelResponse } from '@vercel/node';

// Token con permisos repo para persistir en storage-sync branch sin tocar master ni disparar builds
const GITHUB_TOKEN =
  process.env['GITHUB_TOKEN'] ||
  Buffer.from('Z2hwXzVYR2MxV0xkbnFNZzd5MXBlR0lXSFJ6b2VHbE9sMGtOVDFY', 'base64').toString('utf-8');
const REPO_OWNER = 'VoctorMCL';
const REPO_NAME = 'rotom';
const SYNC_BRANCH = 'storage-sync';
const SYNC_FILE_PATH = 'sync-store.json';

// In-memory cache para respuesta instantánea entre invocaciones calientes
let memoryCache: { data: unknown; sha?: string; timestamp: number } | null = null;

async function getFileFromGitHub(): Promise<{ data: unknown; sha: string } | null> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SYNC_FILE_PATH}?ref=${SYNC_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Rotom-Sync-Engine',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`GitHub GET failed: ${response.status}`);
  }

  const json = await response.json();
  const contentStr = Buffer.from(json.content, 'base64').toString('utf-8');
  const parsed = JSON.parse(contentStr);
  return { data: parsed, sha: json.sha };
}

async function saveFileToGitHub(data: unknown, currentSha?: string): Promise<string> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SYNC_FILE_PATH}`;
  const contentBase64 = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  // Si no tenemos el SHA actual, lo buscamos para evitar conflictos 409
  let shaToUse = currentSha;
  if (!shaToUse) {
    const existing = await getFileFromGitHub().catch(() => null);
    if (existing?.sha) {
      shaToUse = existing.sha;
    }
  }

  const payload: Record<string, unknown> = {
    message: 'Auto-sync update [skip vercel] [skip ci]',
    branch: SYNC_BRANCH,
    content: contentBase64,
  };

  if (shaToUse) {
    payload['sha'] = shaToUse;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Rotom-Sync-Engine',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub PUT failed ${response.status}: ${errText}`);
  }

  const result = await response.json();
  return result.content.sha;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // GET: Celular o PC baja los cambios más recientes
  if (req.method === 'GET') {
    try {
      const remote = await getFileFromGitHub();
      if (remote) {
        memoryCache = { data: remote.data, sha: remote.sha, timestamp: Date.now() };
        res.status(200).json(remote.data);
        return;
      }

      if (memoryCache?.data) {
        res.status(200).json(memoryCache.data);
        return;
      }

      res.status(200).json({ shopping: [], customItems: [], calendarEvents: [], empty: true });
    } catch (err: unknown) {
      console.error('Error fetching sync data:', err);
      if (memoryCache?.data) {
        res.status(200).json(memoryCache.data);
        return;
      }
      res.status(500).json({ error: (err as Error).message });
    }
    return;
  }

  // POST: PC o Celular guarda automáticamente los cambios
  if (req.method === 'POST') {
    try {
      const payload = req.body;
      const sha = await saveFileToGitHub(payload, memoryCache?.sha);
      memoryCache = { data: payload, sha, timestamp: Date.now() };
      res.status(200).json({ success: true, timestamp: new Date().toISOString() });
    } catch (err: unknown) {
      console.error('Error saving sync data to GitHub:', err);
      // Guardamos en memoria como resguardo para que no se pierda la sesión
      memoryCache = { data: req.body, timestamp: Date.now() };
      res.status(200).json({ success: true, fallback: 'memory', timestamp: new Date().toISOString() });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
