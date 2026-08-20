import { NextRequest, NextResponse } from 'next/server';

// Server-side in-memory & file persistence store for Workspaces
const workspaceStore = new Map<string, any>();

// Force Dynamic Rendering on Next.js Server (No Static Optimization / No CDN Stale Cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';
  const data = workspaceStore.get(workspaceId) || null;

  return NextResponse.json(data || { workspaceId, notFound: true }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id || 'rc_ws_main';
    const body = await request.json();

    if (!body || !Array.isArray(body.projects)) {
      return NextResponse.json(
        { error: 'Payload inválido: debe contener un arreglo de proyectos.' },
        { status: 400 }
      );
    }

    const payload = {
      ...body,
      workspaceId,
      updatedAt: body.updatedAt || Date.now()
    };

    workspaceStore.set(workspaceId, payload);

    return NextResponse.json(
      {
        success: true,
        message: 'Workspace guardado exitosamente en el servidor.',
        workspaceId,
        updatedAt: payload.updatedAt
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error procesando la solicitud en el servidor.', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}
