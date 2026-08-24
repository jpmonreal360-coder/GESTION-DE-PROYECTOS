import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

function maskKey(key: string): string {
  if (key.length <= 6) return key;
  return key.substring(0, 5) + '***' + key.substring(key.length - 2);
}

export async function GET(request: NextRequest) {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'local';
  const { url, token } = getUpstashConfig();

  const baseHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-App-Build': commit,
    'X-Persistence-Source': 'upstash'
  };

  if (!url || !token) {
    return NextResponse.json(
      {
        provider: 'upstash',
        status: 'error',
        error: 'PERSISTENCE_UNAVAILABLE',
        message: 'Variables de entorno no configuradas en Vercel.',
        commit
      },
      { status: 503, headers: baseHeaders }
    );
  }

  try {
    const wsId = 'rc_ws_main';
    const redisKey = `ws_${wsId}`;
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
        {
          provider: 'upstash',
          status: 'error',
          error: 'DATABASE_UNREACHABLE',
          commit
        },
        { status: 503, headers: baseHeaders }
      );
    }

    const data = await res.json().catch(() => null);
    if (data && data.result) {
      let record = data.result;
      if (typeof record === 'string') {
        try { record = JSON.parse(record); } catch (e) {}
      }
      const state = record?.state || record;
      const revision = Number(record?.revision || state?.revision || 1);
      const updatedAt = Number(record?.updatedAt || state?.updatedAt || 0);
      const projectsCount = Array.isArray(state?.projects) ? state.projects.length : 0;
      const expensesCount = Array.isArray(state?.expenses) ? state.expenses.length : 0;
      const checksum = String(record?.checksum || state?.checksum || '').substring(0, 12);

      return NextResponse.json(
        {
          provider: 'upstash',
          status: 'ok',
          workspaceKey: maskKey(redisKey),
          revision,
          updatedAt,
          updatedAtIso: updatedAt ? new Date(updatedAt).toISOString() : 'N/A',
          projectsCount,
          expensesCount,
          checksumPrefix: checksum,
          commit
        },
        { status: 200, headers: baseHeaders }
      );
    }

    return NextResponse.json(
      {
        provider: 'upstash',
        status: 'ok',
        workspaceKey: maskKey(redisKey),
        notFound: true,
        commit
      },
      { status: 200, headers: baseHeaders }
    );

  } catch (err: any) {
    return NextResponse.json(
      {
        provider: 'upstash',
        status: 'error',
        error: err.message,
        commit
      },
      { status: 503, headers: baseHeaders }
    );
  }
}
