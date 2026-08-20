import { NextRequest, NextResponse } from 'next/server';

// Force Dynamic Rendering on Next.js Server (No Static Optimization / No CDN Stale Cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KVDB_BUCKET = '6n9f8j7k6l5m4n3b2a1c';
const FIREBASE_DB_URL = 'https://rc-proyectos-default-rtdb.firebaseio.com/workspaces';
const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/66b0a1a0acd3cb34a87123a1';

function getKvdbUrl(wsId: string): string {
  return `https://kvdb.io/${KVDB_BUCKET}/ws_${encodeURIComponent(wsId)}`;
}

function getFirebaseWorkspaceUrl(wsId: string): string {
  return `${FIREBASE_DB_URL}/${encodeURIComponent(wsId)}.json`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';

  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  };

  try {
    // 1. Tier 1: Persistent Public Cloud KV Store (KVDB.io)
    const kvUrl = getKvdbUrl(workspaceId);
    const kvRes = await fetch(kvUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (kvRes && kvRes.ok) {
      const record = await kvRes.json().catch(() => null);
      if (record && Array.isArray(record.projects)) {
        return NextResponse.json(
          {
            ...record,
            workspaceId,
            updatedAt: Number(record.updatedAt) || Date.now()
          },
          { status: 200, headers: noCacheHeaders }
        );
      }
    }

    // 2. Tier 2: Persistent Firebase Realtime DB REST API Fallback
    const firebaseUrl = getFirebaseWorkspaceUrl(workspaceId);
    const fbRes = await fetch(firebaseUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (fbRes && fbRes.ok) {
      const record = await fbRes.json().catch(() => null);
      if (record && Array.isArray(record.projects)) {
        return NextResponse.json(
          {
            ...record,
            workspaceId,
            updatedAt: Number(record.updatedAt) || Date.now()
          },
          { status: 200, headers: noCacheHeaders }
        );
      }
    }

    // 3. Tier 3: Secondary JSONBin Persistent Fallback
    const binRes = await fetch(JSONBIN_URL, {
      method: 'GET',
      headers: {
        'X-Bin-Meta': 'false',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (binRes && binRes.ok) {
      const payload = await binRes.json().catch(() => null);
      const record = payload ? (payload.record || payload.data || payload) : null;
      if (record && record.workspaceId === workspaceId && Array.isArray(record.projects)) {
        return NextResponse.json(
          {
            ...record,
            workspaceId,
            updatedAt: Number(record.updatedAt) || Date.now()
          },
          { status: 200, headers: noCacheHeaders }
        );
      }
    }

  } catch (err: any) {
    console.error('Error al leer el workspace de la base de datos:', err);
  }

  // Not found in persistent DB
  return NextResponse.json(
    { workspaceId, notFound: true },
    { status: 200, headers: noCacheHeaders }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache'
  };

  try {
    const workspaceId = params.id || 'rc_ws_main';
    const payload = await request.json();

    if (!payload || !Array.isArray(payload.projects)) {
      return NextResponse.json(
        { error: 'Payload inválido: debe contener un arreglo de proyectos.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const updatedAt = Number(payload.updatedAt) || Date.now();
    const recordState = {
      ...payload,
      workspaceId,
      updatedAt
    };

    // Upsert into Persistent KV Cloud Store (KVDB.io)
    const kvUrl = getKvdbUrl(workspaceId);
    await fetch(kvUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordState)
    }).catch(() => null);

    // Also update Firebase Realtime DB REST asynchronously
    const firebaseUrl = getFirebaseWorkspaceUrl(workspaceId);
    fetch(firebaseUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordState)
    }).catch(() => null);

    // Also update secondary JSONBin store asynchronously
    fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordState)
    }).catch(() => null);

    return NextResponse.json(
      {
        ...recordState,
        success: true,
        workspaceId,
        updatedAt
      },
      { status: 200, headers: noCacheHeaders }
    );

  } catch (err: any) {
    console.error('Error al guardar el workspace en la base de datos:', err);
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
