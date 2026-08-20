import { NextRequest, NextResponse } from 'next/server';

// Force Dynamic Rendering on Next.js Server (No Static Optimization / No CDN Stale Cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Persistent Cloud Database Configuration (Upstash Redis / Vercel KV REST API)
const DB_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || 'https://glowing-shrimp-40243.upstash.io';
const DB_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || 'AZwzAAlgZWFlMmExYTE0OTk0NGU2YTk4NDQyMDY0YTRlOWRkMTBwNDAyNDM';

function getRedisKey(wsId: string): string {
  return `ws_${wsId.trim()}`;
}

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store'
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';
  const redisKey = getRedisKey(workspaceId);

  if (!DB_URL || !DB_TOKEN) {
    return NextResponse.json(
      { error: 'Configuración de base de datos persistente no encontrada.' },
      { status: 500, headers: noCacheHeaders }
    );
  }

  try {
    // Query Single Source of Truth Persistent Cloud Database (Upstash Redis / Vercel KV REST)
    const res = await fetch(`${DB_URL}/get/${encodeURIComponent(redisKey)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DB_TOKEN}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
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
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error al consultar la base de datos persistente.', details: err.message },
      { status: 500, headers: noCacheHeaders }
    );
  }

  // Record not found in persistent DB: return notFound: true
  return NextResponse.json(
    { workspaceId, notFound: true },
    { status: 200, headers: noCacheHeaders }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';

  if (!DB_URL || !DB_TOKEN) {
    return NextResponse.json(
      { error: 'Configuración de base de datos persistente no encontrada.' },
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
      projects: payload.projects,
      expenses: payload.expenses,
      tasks: payload.tasks,
      documents: payload.documents,
      wikiDocs: payload.wikiDocs,
      categories: payload.categories,
      projectCategories: payload.projectCategories,
      updatedAt
    };

    const redisKey = getRedisKey(workspaceId);
    const jsonString = JSON.stringify(record);

    // Atomic Upsert into Persistent Cloud Database
    const res = await fetch(`${DB_URL}/set/${encodeURIComponent(redisKey)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: jsonString
    }).catch(() => null);

    if (!res || !res.ok) {
      return NextResponse.json(
        { error: 'Fallo al ejecutar el upsert en la base de datos persistente.' },
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
