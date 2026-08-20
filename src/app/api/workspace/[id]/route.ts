import { NextRequest, NextResponse } from 'next/server';

// Force Dynamic Rendering on Next.js Server (No Static Optimization / No CDN Stale Cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store'
};

const DB_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const DB_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

function getRedisKey(wsId: string): string {
  return `ws_${wsId.trim()}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';

  if (!DB_URL || !DB_TOKEN) {
    return NextResponse.json(
      {
        error: 'Error de configuración: Faltan las variables de entorno KV_REST_API_URL y KV_REST_API_TOKEN (o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN) en Vercel Production.',
        workspaceId,
        notFound: false
      },
      { status: 500, headers: noCacheHeaders }
    );
  }

  try {
    const redisKey = getRedisKey(workspaceId);
    const res = await fetch(`${DB_URL}/get/${encodeURIComponent(redisKey)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DB_TOKEN}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Error de comunicación con la base de datos persistente.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    const data = await res.json();
    if (data && data.result) {
      let record = data.result;
      if (typeof record === 'string') {
        try {
          record = JSON.parse(record);
        } catch (e) {
          // Keep as object if parsing fails
        }
      }

      if (record && (record.state || Array.isArray(record.projects))) {
        const stateData = record.state || record;
        return NextResponse.json(
          {
            ...stateData,
            workspaceId,
            updatedAt: Number(record.updatedAt || stateData.updatedAt) || Date.now()
          },
          { status: 200, headers: noCacheHeaders }
        );
      }
    }

    // Record not found in persistent DB: return notFound: true
    return NextResponse.json(
      { workspaceId, notFound: true },
      { status: 200, headers: noCacheHeaders }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error al consultar la base de datos persistente.', details: err.message },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';

  if (!DB_URL || !DB_TOKEN) {
    return NextResponse.json(
      {
        error: 'Error de configuración: Faltan las variables de entorno KV_REST_API_URL y KV_REST_API_TOKEN (o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN) en Vercel Production.',
        workspaceId
      },
      { status: 500, headers: noCacheHeaders }
    );
  }

  try {
    const payload = await request.json();

    if (!payload || payload.workspaceId !== workspaceId || !Array.isArray(payload.projects)) {
      return NextResponse.json(
        { error: 'Payload inválido: workspaceId desalineado o projects no es un arreglo.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const updatedAt = Number(payload.updatedAt) || Date.now();
    const record = {
      id: workspaceId,
      workspaceId,
      state: payload,
      updatedAt
    };

    const redisKey = getRedisKey(workspaceId);
    const jsonString = JSON.stringify(record);

    const res = await fetch(`${DB_URL}/set/${encodeURIComponent(redisKey)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: jsonString
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Error ejecutando upsert en la base de datos persistente.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    return NextResponse.json(
      {
        ...payload,
        workspaceId,
        updatedAt
      },
      { status: 200, headers: noCacheHeaders }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error guardando en la base de datos persistente.', details: err.message },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}
