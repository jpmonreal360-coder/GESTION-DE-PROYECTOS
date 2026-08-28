export interface RedisConfig {
  url: string;
  token: string;
}

export function getUpstashConfig(customConfig?: RedisConfig): RedisConfig {
  const isTestEnv =
    process.env.VERCEL_ENV === 'preview' ||
    process.env.VERCEL_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL);

  if (isTestEnv && !customConfig) {
    const testUrl = process.env.TEST_UPSTASH_REDIS_REST_URL;
    const testToken = process.env.TEST_UPSTASH_REDIS_REST_TOKEN;

    if (!testUrl || !testToken) {
      throw new Error('TEST_ENVIRONMENT_VIOLATION: Falta TEST_UPSTASH_REDIS_REST_URL o TEST_UPSTASH_REDIS_REST_TOKEN en modo test. Se prohíbe el uso de credenciales de producción.');
    }

    return {
      url: testUrl.trim().replace(/^["']|["']$/g, '').replace(/\/$/, ''),
      token: testToken.trim().replace(/^["']|["']$/g, '')
    };
  }

  if (customConfig) {
    return {
      url: customConfig.url.trim().replace(/^["']|["']$/g, '').replace(/\/$/, ''),
      token: customConfig.token.trim().replace(/^["']|["']$/g, '')
    };
  }

  let url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url) url = url.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
  if (token) token = token.trim().replace(/^["']|["']$/g, '');

  return { url: url || '', token: token || '' };
}

export interface PendingUploadRecord {
  uploadId: string;
  storageKey: string;
  workspaceId: string;
  projectId: string;
  createdAt: number;
  completed: boolean;
}

/**
 * Key Prefix Pattern: `TEST_ONLY_att_pending:${uploadId}` in test mode or `att_pending:${uploadId}` in production.
 * Rationale: Existing project keys use prefix `ws_` (e.g. `ws_rc_ws_main`) or `ws_backup:`.
 * Using `TEST_ONLY_att_pending:` guarantees 0% key collision with any existing workspace state, backups, or system keys.
 */
export function getPendingUploadKey(uploadId: string): string {
  const isTestEnv =
    process.env.VERCEL_ENV === 'preview' ||
    process.env.VERCEL_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL);
  const prefix = isTestEnv ? 'TEST_ONLY_att_pending' : 'att_pending';
  return `${prefix}:${uploadId.trim()}`;
}

export async function registerPendingUpload(record: PendingUploadRecord, customConfig?: RedisConfig): Promise<void> {
  const { url, token } = getUpstashConfig(customConfig);
  if (!url || !token) {
    console.warn('[PENDING UPLOADS REGISTRY] Upstash Redis URL/Token no configurados. Omitiendo registro de huérfano.');
    return;
  }

  const key = getPendingUploadKey(record.uploadId);
  const ttlSeconds = (process.env.NODE_ENV === 'test' || Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL)) ? 60 : 7 * 24 * 3600;

  try {
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record),
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error(`[PENDING UPLOADS REGISTRY ERROR] Failed SET ${key}: status ${res.status}`);
    }
  } catch (err: any) {
    console.error(`[PENDING UPLOADS REGISTRY ERROR] Exception while registering ${key}:`, err.message || err);
  }
}

export async function markPendingUploadCompleted(uploadId: string, record?: Partial<PendingUploadRecord>, customConfig?: RedisConfig): Promise<void> {
  const { url, token } = getUpstashConfig(customConfig);
  if (!url || !token) return;

  const key = getPendingUploadKey(uploadId);

  try {
    const getRes = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });

    let current: Partial<PendingUploadRecord> = record || {};
    if (getRes.ok) {
      const data = await getRes.json().catch(() => ({}));
      if (data && data.result) {
        try {
          let parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          current = { ...parsed, ...record };
        } catch (e) {}
      }
    }

    current.completed = true;
    const ttlSeconds = (process.env.NODE_ENV === 'test' || Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL)) ? 60 : 7 * 24 * 3600;

    await fetch(`${url}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(current),
      cache: 'no-store'
    });
  } catch (err: any) {
    console.error(`[PENDING UPLOADS REGISTRY ERROR] Exception while marking complete for ${key}:`, err.message || err);
  }
}

export async function getPendingUpload(uploadId: string, customConfig?: RedisConfig): Promise<PendingUploadRecord | null> {
  const { url, token } = getUpstashConfig(customConfig);
  if (!url || !token) return null;

  const key = getPendingUploadKey(uploadId);

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.result) return null;

    let parsed = data.result;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch (e) {}
    }
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch (e) {}
    }

    return parsed as PendingUploadRecord;
  } catch (err: any) {
    console.error(`[PENDING UPLOADS REGISTRY ERROR] Exception while fetching ${key}:`, err.message || err);
    return null;
  }
}
