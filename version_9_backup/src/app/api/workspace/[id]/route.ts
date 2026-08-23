import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBuildHeaders() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'local';
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || 'local';
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
    'X-App-Build': commit,
    'X-Commit-SHA': commit,
    'X-Deployment-Id': deploymentId
  };
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

function getRedisKey(wsId: string): string {
  return `ws_${wsId.trim()}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';
  const { url, token } = getUpstashConfig();
  const responseHeaders = getBuildHeaders();

  if (!url || !token) {
    return NextResponse.json(
      {
        error: 'Error de configuración en producción: Faltan las variables de entorno UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN (o KV_REST_API_URL y KV_REST_API_TOKEN) en Vercel Production.',
        workspaceId,
        notFound: false
      },
      { status: 503, headers: responseHeaders }
    );
  }

  try {
    const redisKey = getRedisKey(workspaceId);
    const res = await fetch(`${url}/get/${encodeURIComponent(redisKey)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (!res || !res.ok) {
      return NextResponse.json(
        { error: 'Servicio de base de datos persistente no disponible.', workspaceId },
        { status: 503, headers: responseHeaders }
      );
    }

    const data = await res.json().catch(() => null);
    if (data && data.result) {
      let record = data.result;
      if (typeof record === 'string') {
        try {
          record = JSON.parse(record);
        } catch (e) {
          // Keep raw if parse fails
        }
      }

      if (record && (record.state || Array.isArray(record.projects))) {
        const stateData = record.state || record;
        const updatedAt = Number(record.updatedAt || stateData.updatedAt) || Date.now();
        return NextResponse.json(
          {
            ...stateData,
            workspaceId,
            updatedAt
          },
          { status: 200, headers: responseHeaders }
        );
      }
    }

    // Key does not exist in persistent Upstash Redis store
    return NextResponse.json(
      { workspaceId, notFound: true },
      { status: 200, headers: responseHeaders }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error al consultar la base de datos persistente.', details: err.message },
      { status: 503, headers: responseHeaders }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';
  const { url, token } = getUpstashConfig();
  const responseHeaders = getBuildHeaders();

  if (!url || !token) {
    return NextResponse.json(
      {
        error: 'Error de configuración en producción: Faltan las variables de entorno UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN (o KV_REST_API_URL y KV_REST_API_TOKEN) en Vercel Production.',
        workspaceId
      },
      { status: 503, headers: responseHeaders }
    );
  }

  try {
    const payload = await request.json();

    if (!payload || payload.workspaceId !== workspaceId || !Array.isArray(payload.projects)) {
      return NextResponse.json(
        { error: 'Payload inválido: workspaceId desalineado o projects no es un arreglo.' },
        { status: 400, headers: responseHeaders }
      );
    }

    const redisKey = getRedisKey(workspaceId);

    // Read existing record to compute strictly increasing timestamp
    let existingUpdatedAt = 0;
    const getRes = await fetch(`${url}/get/${encodeURIComponent(redisKey)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (getRes && getRes.ok) {
      const existingData = await getRes.json().catch(() => null);
      if (existingData && existingData.result) {
        let record = existingData.result;
        if (typeof record === 'string') {
          try { record = JSON.parse(record); } catch (e) {}
        }
        existingUpdatedAt = Number(record?.updatedAt || record?.state?.updatedAt || 0);
      }
    }

    const updatedAt = Math.max(Date.now(), existingUpdatedAt + 1);

    const fullState = {
      ...payload,
      workspaceId,
      updatedAt
    };

    const recordToSave = {
      id: workspaceId,
      workspaceId,
      state: fullState,
      updatedAt
    };

    const setRes = await fetch(`${url}/set/${encodeURIComponent(redisKey)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recordToSave)
    }).catch(() => null);

    if (!setRes || !setRes.ok) {
      return NextResponse.json(
        { error: 'Fallo al ejecutar el upsert en Upstash Redis.' },
        { status: 503, headers: responseHeaders }
      );
    }

    return NextResponse.json(
      fullState,
      { status: 200, headers: responseHeaders }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error guardando en la base de datos persistente.', details: err.message },
      { status: 503, headers: responseHeaders }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}
