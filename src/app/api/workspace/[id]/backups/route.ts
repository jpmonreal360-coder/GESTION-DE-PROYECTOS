import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

function getRedisKey(wsId: string): string {
  return `ws_${wsId.trim()}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';
  const { url, token } = getUpstashConfig();

  // Validate admin secret or authorization header if ADMIN_BACKUP_SECRET is configured
  const adminSecret = process.env.ADMIN_BACKUP_SECRET;
  const reqSecret = request.headers.get('X-Admin-Secret') || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (adminSecret && reqSecret !== adminSecret) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Se requiere secreto administrativo válido.' },
      { status: 401 }
    );
  }

  if (!url || !token) {
    return NextResponse.json(
      { error: 'PERSISTENCE_UNAVAILABLE', message: 'Variables de entorno no configuradas.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'MANUAL_OR_BULK_MUTATION';

    // Read current state from Redis
    const redisKey = getRedisKey(workspaceId);
    const getRes = await fetch(`${url}/get/${encodeURIComponent(redisKey)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (!getRes || !getRes.ok) {
      return NextResponse.json(
        { error: 'PERSISTENCE_UNAVAILABLE', message: 'No se pudo leer el estado actual para respaldar.' },
        { status: 503 }
      );
    }

    const data = await getRes.json().catch(() => null);
    if (!data || !data.result) {
      return NextResponse.json(
        { error: 'WORKSPACE_NOT_FOUND', message: 'No existe el workspace a respaldar.' },
        { status: 404 }
      );
    }

    let record = data.result;
    if (typeof record === 'string') {
      try { record = JSON.parse(record); } catch (e) {}
    }

    const state = record?.state || record;
    const revision = Number(record?.revision || state?.revision || 1);
    const timestamp = Date.now();
    const backupKeyId = `${workspaceId}:backup:${timestamp}:rev${revision}`;
    const backupRedisKey = `ws_backup:${backupKeyId}`;

    const checksum = crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex');

    const backupRecord = {
      id: backupKeyId,
      workspaceId,
      originalRevision: revision,
      reason,
      createdAt: timestamp,
      checksum,
      projectsCount: Array.isArray(state.projects) ? state.projects.length : 0,
      expensesCount: Array.isArray(state.expenses) ? state.expenses.length : 0,
      state
    };

    const setRes = await fetch(`${url}/set/${encodeURIComponent(backupRedisKey)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backupRecord)
    }).catch(() => null);

    if (!setRes || !setRes.ok) {
      return NextResponse.json(
        { error: 'BACKUP_FAILED', message: 'Fallo al escribir la clave de respaldo en Redis.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        backupKey: backupRedisKey,
        workspaceId,
        revision,
        timestamp,
        checksum: checksum.substring(0, 12)
      },
      { status: 200 }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'BACKUP_FAILED', details: err.message },
      { status: 500 }
    );
  }
}
