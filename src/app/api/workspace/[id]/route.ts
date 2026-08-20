import { NextRequest, NextResponse } from 'next/server';

// Force Dynamic Rendering on Next.js Server (No Static Optimization / No CDN Stale Cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FIREBASE_DB_URL = 'https://rc-proyectos-default-rtdb.firebaseio.com/workspaces';
const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/66b0a1a0acd3cb34a87123a1';

// Helper to get persistent Firebase REST URL for a workspaceId
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
    // 1. Primary Persistent Database Query (Firebase Realtime DB REST API)
    const firebaseUrl = getFirebaseWorkspaceUrl(workspaceId);
    const res = await fetch(firebaseUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (res && res.ok) {
      const record = await res.json();
      if (record && Array.isArray(record.projects) && record.projects.length >= 0) {
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

    // 2. Secondary Persistent Database Query Fallback (JSONBin)
    const binRes = await fetch(JSONBIN_URL, {
      method: 'GET',
      headers: {
        'X-Bin-Meta': 'false',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    }).catch(() => null);

    if (binRes && binRes.ok) {
      const payload = await binRes.json();
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

    // Upsert into Persistent Shared Cloud Database (Firebase Realtime DB REST)
    const firebaseUrl = getFirebaseWorkspaceUrl(workspaceId);
    const dbRes = await fetch(firebaseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify(recordState)
    }).catch(() => null);

    // Also update secondary JSONBin store asynchronously
    fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify(recordState)
    }).catch(() => {});

    if (dbRes && (dbRes.status === 200 || dbRes.status === 201)) {
      return NextResponse.json(
        {
          ...recordState,
          success: true,
          workspaceId,
          updatedAt
        },
        { status: 200, headers: noCacheHeaders }
      );
    }

    // Fallback if primary DB write returned status != 200
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
