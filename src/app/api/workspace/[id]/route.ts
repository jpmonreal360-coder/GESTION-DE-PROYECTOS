import { NextRequest, NextResponse } from 'next/server';

// Force Dynamic Rendering on Next.js Server (No Static Optimization / No CDN Stale Cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Persistent Cloud Database Configuration (Upstash Redis / Vercel KV REST API)
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || 'https://glowing-shrimp-40243.upstash.io';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || 'AZwzAAlgZWFlMmExYTE0OTk0NGU2YTk4NDQyMDY0YTRlOWRkMTBwNDAyNDM';

// Secondary Persistent DB Fallback (Firebase Realtime DB REST)
const FIREBASE_DB_URL = 'https://rc-proyectos-default-rtdb.firebaseio.com/workspaces';

function getRedisKey(wsId: string): string {
  return `ws_${wsId.trim()}`;
}

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
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

  try {
    // 1. Primary Query: Persistent Upstash Redis / Vercel KV REST Database
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(redisKey)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
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

    // 2. Secondary Persistent Database Query (Firebase REST API Fallback)
    const fbRes = await fetch(`${FIREBASE_DB_URL}/${encodeURIComponent(workspaceId)}.json`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (fbRes && fbRes.ok) {
      const fbRecord = await fbRes.json().catch(() => null);
      if (fbRecord && Array.isArray(fbRecord.projects)) {
        return NextResponse.json(
          {
            ...fbRecord,
            workspaceId,
            updatedAt: Number(fbRecord.updatedAt) || Date.now()
          },
          { status: 200, headers: noCacheHeaders }
        );
      }
    }

  } catch (err: any) {
    console.error('Error al leer de la base de datos persistente:', err);
  }

  // Not found in persistent DB: return notFound: true with HTTP 200
  return NextResponse.json(
    { workspaceId, notFound: true },
    { status: 200, headers: noCacheHeaders }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id || 'rc_ws_main';
    const payload = await request.json();

    if (!payload || payload.workspaceId !== workspaceId || !Array.isArray(payload.projects)) {
      return NextResponse.json(
        { error: 'Payload inválido: workspaceId desalineado o projects no es un arreglo.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const updatedAt = Number(payload.updatedAt) || Date.now();
    const recordState = {
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
    const jsonString = JSON.stringify(recordState);

    // Atomic Upsert in Persistent Upstash Redis / Vercel KV REST DB
    const upstashRes = await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(redisKey)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: jsonString
    }).catch(() => null);

    // Asynchronous secondary write to Firebase Realtime DB REST
    fetch(`${FIREBASE_DB_URL}/${encodeURIComponent(workspaceId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString
    }).catch(() => null);

    if (upstashRes && upstashRes.ok) {
      return NextResponse.json(
        {
          ...payload,
          workspaceId,
          updatedAt
        },
        { status: 200, headers: noCacheHeaders }
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
    console.error('Error al guardar en la base de datos persistente:', err);
    return NextResponse.json(
      { error: 'Error procesando la solicitud en el servidor.', details: err.message },
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
