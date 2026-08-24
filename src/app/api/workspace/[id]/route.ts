import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBuildHeaders(extraHeaders: Record<string, string> = {}) {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'local';
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || 'local';
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
    'X-App-Build': commit,
    'X-Commit-SHA': commit,
    'X-Deployment-Id': deploymentId,
    'X-Persistence-Source': 'upstash',
    ...extraHeaders
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

function computeStateChecksum(stateObj: any): string {
  const normalized = {
    isCustomized: Boolean(stateObj.isCustomized),
    projects: stateObj.projects || [],
    expenses: stateObj.expenses || [],
    batchTables: stateObj.batchTables || [],
    tasks: stateObj.tasks || [],
    documents: stateObj.documents || [],
    wikiDocs: stateObj.wikiDocs || [],
    categories: stateObj.categories || [],
    projectCategories: stateObj.projectCategories || []
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';
  const { url, token } = getUpstashConfig();

  if (!url || !token) {
    return NextResponse.json(
      {
        error: 'PERSISTENCE_UNAVAILABLE',
        message: 'Servicio de persistencia no configurado o no disponible en producción.',
        workspaceId,
        notFound: false
      },
      { status: 503, headers: getBuildHeaders() }
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
        { error: 'PERSISTENCE_UNAVAILABLE', message: 'Fallo de comunicación con Redis.', workspaceId },
        { status: 503, headers: getBuildHeaders() }
      );
    }

    const data = await res.json().catch(() => null);
    if (data && data.result) {
      let record = data.result;
      if (typeof record === 'string') {
        try { record = JSON.parse(record); } catch (e) {}
      }

      if (record && (record.state || Array.isArray(record.projects))) {
        const stateData = record.state || record;
        const updatedAt = Number(record.updatedAt || stateData.updatedAt) || Date.now();
        const revision = Number(record.revision || stateData.revision || 1);
        const schemaVersion = Number(stateData.schemaVersion || 1);
        const checksum = computeStateChecksum(stateData);

        const responseHeaders = getBuildHeaders({
          'X-Workspace-Revision': String(revision)
        });

        return NextResponse.json(
          {
            ...stateData,
            workspaceId,
            revision,
            schemaVersion,
            updatedAt,
            checksum,
            source: 'upstash'
          },
          { status: 200, headers: responseHeaders }
        );
      }
    }

    // Key does not exist in Upstash Redis
    return NextResponse.json(
      { workspaceId, notFound: true, error: 'WORKSPACE_NOT_FOUND' },
      { status: 200, headers: getBuildHeaders() }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'PERSISTENCE_UNAVAILABLE', details: err.message },
      { status: 503, headers: getBuildHeaders() }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id || 'rc_ws_main';
  const { url, token } = getUpstashConfig();

  if (!url || !token) {
    return NextResponse.json(
      {
        error: 'PERSISTENCE_UNAVAILABLE',
        message: 'Servicio de persistencia no disponible.',
        workspaceId
      },
      { status: 503, headers: getBuildHeaders() }
    );
  }

  try {
    const payload = await request.json().catch(() => null);

    if (!payload || payload.workspaceId !== workspaceId || !Array.isArray(payload.projects) || !Array.isArray(payload.expenses)) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Payload de workspace inválido o desalineado.' },
        { status: 400, headers: getBuildHeaders() }
      );
    }

    const redisKey = getRedisKey(workspaceId);

    // Read existing record to check current revision
    let currentRevision = 1;
    let currentUpdatedAt = 0;
    let currentChecksum = '';

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
        const state = record?.state || record;
        currentRevision = Number(record?.revision || state?.revision || 1);
        currentUpdatedAt = Number(record?.updatedAt || state?.updatedAt || 0);
        currentChecksum = computeStateChecksum(state || {});
      }
    }

    // Determine expected revision from payload or If-Match header
    const ifMatchHeader = request.headers.get('If-Match')?.replace(/"/g, '');
    const expectedRevisionInput = payload.expectedRevision ?? payload.revision ?? (ifMatchHeader ? parseInt(ifMatchHeader, 10) : undefined);

    // CONCURRENCY CHECK (409 WORKSPACE_CONFLICT)
    if (expectedRevisionInput !== undefined && Number(expectedRevisionInput) !== currentRevision) {
      const responseHeaders = getBuildHeaders({
        'X-Workspace-Revision': String(currentRevision)
      });

      return NextResponse.json(
        {
          error: 'WORKSPACE_CONFLICT',
          message: 'El workspace en el servidor fue modificado por otra sesión.',
          workspaceId,
          serverRevision: currentRevision,
          expectedRevision: Number(expectedRevisionInput),
          updatedAt: currentUpdatedAt,
          checksum: currentChecksum,
          source: 'upstash'
        },
        { status: 409, headers: responseHeaders }
      );
    }

    // Increment revision
    const nextRevision = currentRevision + 1;
    const updatedAt = Math.max(Date.now(), currentUpdatedAt + 1);

    const fullState = {
      ...payload,
      workspaceId,
      revision: nextRevision,
      schemaVersion: 1,
      updatedAt
    };

    const checksum = computeStateChecksum(fullState);
    fullState.checksum = checksum;

    const recordToSave = {
      id: workspaceId,
      workspaceId,
      revision: nextRevision,
      updatedAt,
      checksum,
      state: fullState
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
        { error: 'PERSISTENCE_UNAVAILABLE', message: 'Fallo al ejecutar el upsert atómico en Upstash Redis.' },
        { status: 503, headers: getBuildHeaders() }
      );
    }

    const responseHeaders = getBuildHeaders({
      'X-Workspace-Revision': String(nextRevision)
    });

    return NextResponse.json(
      {
        ...fullState,
        source: 'upstash'
      },
      { status: 200, headers: responseHeaders }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'PERSISTENCE_UNAVAILABLE', details: err.message },
      { status: 503, headers: getBuildHeaders() }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}
