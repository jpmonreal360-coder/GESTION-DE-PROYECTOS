import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { WorkspaceState } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface WorkspaceEnvelope {
  version: 1;
  workspaceId: string;
  revision: number;
  updatedAt: number;
  checksum: string;
  state: WorkspaceState;
}

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

function getUpstashConfig(): { url?: string; token?: string } {
  const vercelEnv = process.env.VERCEL_ENV;
  const isTestOrPreview =
    vercelEnv === 'preview' ||
    vercelEnv === 'development' ||
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL);

  if (isTestOrPreview) {
    const testUrl = process.env.TEST_UPSTASH_REDIS_REST_URL;
    const testToken = process.env.TEST_UPSTASH_REDIS_REST_TOKEN;

    if (!testUrl || !testToken || testUrl === '[SENSITIVE]' || testToken === '[SENSITIVE]') {
      return { url: undefined, token: undefined };
    }

    return {
      url: testUrl.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '').replace(/[\r\n]/g, ''),
      token: testToken.trim().replace(/^["']|["']$/g, '').replace(/[\r\n]/g, '')
    };
  }

  let url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url === '[SENSITIVE]') url = undefined;
  if (token === '[SENSITIVE]') token = undefined;

  if (url) url = url.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
  if (token) token = token.trim().replace(/^["']|["']$/g, '');

  return { url: url || undefined, token: token || undefined };
}

function getRedisKey(wsId: string): string {
  return `ws_${wsId.trim()}`;
}

function computeStateChecksum(stateObj: any): string {
  const normalized = {
    isCustomized: Boolean(stateObj.isCustomized),
    projects: Array.isArray(stateObj.projects) ? stateObj.projects : [],
    expenses: Array.isArray(stateObj.expenses) ? stateObj.expenses : [],
    batchTables: Array.isArray(stateObj.batchTables) ? stateObj.batchTables : [],
    tasks: Array.isArray(stateObj.tasks) ? stateObj.tasks : [],
    documents: Array.isArray(stateObj.documents) ? stateObj.documents : [],
    wikiDocs: Array.isArray(stateObj.wikiDocs) ? stateObj.wikiDocs : [],
    categories: Array.isArray(stateObj.categories) ? stateObj.categories : [],
    projectCategories: Array.isArray(stateObj.projectCategories) ? stateObj.projectCategories : [],
    responsibles: Array.isArray(stateObj.responsibles) ? stateObj.responsibles : []
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

// Single strict helper to parse expectedRevision
function parseExpectedRevision(rawHeader: string | null, rawBody: unknown): { revision: number | null; error: string | null } {
  let headerValue: string | null = null;
  if (rawHeader !== null && rawHeader !== undefined) {
    let trimmed = rawHeader.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      trimmed = trimmed.slice(1, -1);
    }
    headerValue = trimmed;
  }

  const parseSingle = (val: unknown): number | null => {
    if (typeof val === 'number') {
      if (Number.isSafeInteger(val) && val >= 1) return val;
      return null;
    }
    if (typeof val === 'string') {
      if (!/^[1-9]\d*$/.test(val)) return null;
      const num = Number(val);
      if (Number.isSafeInteger(num) && num >= 1) return num;
      return null;
    }
    return null;
  };

  const bodyRev = rawBody !== undefined && rawBody !== null ? parseSingle(rawBody) : null;
  const headerRev = headerValue !== null ? parseSingle(headerValue) : null;

  if (rawBody !== undefined && rawBody !== null && bodyRev === null) {
    return { revision: null, error: 'INVALID_EXPECTED_REVISION' };
  }

  if (rawHeader !== null && rawHeader !== undefined && headerRev === null) {
    return { revision: null, error: 'INVALID_EXPECTED_REVISION' };
  }

  if (bodyRev !== null && headerRev !== null && bodyRev !== headerRev) {
    return { revision: null, error: 'INVALID_EXPECTED_REVISION' };
  }

  const finalRev = bodyRev ?? headerRev;
  if (finalRev === null) {
    return { revision: null, error: 'INVALID_EXPECTED_REVISION' };
  }

  return { revision: finalRev, error: null };
}

// Single typed helper function to decode workspace record (envelope or legacy snapshot)
function decodeWorkspaceRecord(record: any): { state: WorkspaceState; revision: number; updatedAt: number; checksum: string } | null {
  if (!record || typeof record !== 'object') return null;
  const stateData: WorkspaceState = record.state || record;
  if (!stateData || typeof stateData !== 'object' || !Array.isArray(stateData.projects)) return null;

  const revision = Number(record.revision || (stateData as any).revision || 1);
  const updatedAt = Number(record.updatedAt || (stateData as any).updatedAt) || Date.now();
  const checksum = String(record.checksum || computeStateChecksum(stateData));

  return { state: stateData, revision, updatedAt, checksum };
}

// Server-Side Lua Script: Strict order of operations. Single SET occurs AFTER constructing final envelope.
const LUA_CAS_SCRIPT = `
-- ARGV: expectedRevision, workspaceId, candidateUpdatedAt, checksum, stateJson
local currentRaw = redis.call('GET', KEYS[1])
if not currentRaw then
  return cjson.encode({ code = 'NOT_FOUND' })
end

local okCurrent, currentRecord = pcall(cjson.decode, currentRaw)
if not okCurrent or type(currentRecord) ~= 'table' then
  return cjson.encode({ code = 'CORRUPT_RECORD' })
end

local currentState = currentRecord.state or currentRecord
if type(currentState) ~= 'table' then
  return cjson.encode({ code = 'CORRUPT_RECORD' })
end

local currentRevision = tonumber(currentRecord.revision or currentState.revision or 1)
local currentUpdatedAt = tonumber(currentRecord.updatedAt or currentState.updatedAt or 0)
local expectedRevision = tonumber(ARGV[1])
local candidateUpdatedAt = tonumber(ARGV[3])

if not expectedRevision or expectedRevision < 1 or expectedRevision ~= math.floor(expectedRevision) then
  return cjson.encode({ code = 'INVALID_EXPECTED_REVISION' })
end

if expectedRevision ~= currentRevision then
  return cjson.encode({
    code = 'CONFLICT',
    serverRevision = currentRevision,
    updatedAt = currentUpdatedAt,
    checksum = currentRecord.checksum or currentState.checksum or ''
  })
end

local okState, newState = pcall(cjson.decode, ARGV[5])
if not okState or type(newState) ~= 'table' then
  return cjson.encode({ code = 'INVALID_STATE' })
end

local nextRevision = currentRevision + 1
local nextUpdatedAt = math.max(candidateUpdatedAt or 0, currentUpdatedAt + 1)
local finalEnvelope = {
  version = 1,
  workspaceId = ARGV[2],
  revision = nextRevision,
  updatedAt = nextUpdatedAt,
  checksum = ARGV[4],
  state = newState
}
local finalRaw = cjson.encode(finalEnvelope)

-- Single write of the operation AFTER creating the final envelope!
redis.call('SET', KEYS[1], finalRaw)

return cjson.encode({
  code = 'OK',
  workspaceId = ARGV[2],
  revision = nextRevision,
  updatedAt = nextUpdatedAt,
  checksum = ARGV[4]
})
`;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id;

  if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
    return NextResponse.json(
      { error: 'WORKSPACE_ID_REQUIRED', message: 'El parámetro workspaceId es requerido.' },
      { status: 400, headers: getBuildHeaders() }
    );
  }

  // Server Preview Guard: Reject production workspace access in Preview or Test environment BEFORE querying Redis
  const isPreviewEnv = process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'test';
  if (isPreviewEnv && (workspaceId === 'rc_ws_main' || workspaceId === 'ws_rc_ws_main')) {
    return NextResponse.json(
      { error: 'FORBIDDEN_PREVIEW_WORKSPACE', message: 'El acceso a workspace de producción está prohibido en entorno Preview/Test.' },
      { status: 403, headers: getBuildHeaders() }
    );
  }

  const { url, token } = getUpstashConfig();

  if (!url || !token) {
    return NextResponse.json(
      {
        error: 'PERSISTENCE_UNAVAILABLE',
        message: 'Servicio de persistencia no configurado.',
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
      let rawRecord = data.result;
      if (typeof rawRecord === 'string') {
        try { rawRecord = JSON.parse(rawRecord); } catch (e) {}
      }

      const decoded = decodeWorkspaceRecord(rawRecord);
      if (decoded) {
        // In-memory defaults only; ZERO WRITES to Redis
        const stateData = { ...decoded.state };
        if (!stateData.responsibles) {
          stateData.responsibles = [];
        }

        const responseHeaders = getBuildHeaders({
          'X-Workspace-Revision': String(decoded.revision)
        });

        return NextResponse.json(
          {
            ...stateData,
            workspaceId,
            revision: decoded.revision,
            updatedAt: decoded.updatedAt,
            checksum: decoded.checksum,
            source: 'upstash'
          },
          { status: 200, headers: responseHeaders }
        );
      }
    }

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
  const workspaceId = params.id;

  if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
    return NextResponse.json(
      { error: 'WORKSPACE_ID_REQUIRED', message: 'El parámetro workspaceId es requerido.' },
      { status: 400, headers: getBuildHeaders() }
    );
  }

  // Server Preview Guard: Reject production workspace access in Preview or Test environment BEFORE querying Redis
  const isPreviewEnv = process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'test';
  if (isPreviewEnv && (workspaceId === 'rc_ws_main' || workspaceId === 'ws_rc_ws_main')) {
    return NextResponse.json(
      { error: 'FORBIDDEN_PREVIEW_WORKSPACE', message: 'El acceso a workspace de producción está prohibido en entorno Preview/Test.' },
      { status: 403, headers: getBuildHeaders() }
    );
  }

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

    // Validation 1: Payload shape and completeness
    if (!payload || payload.workspaceId !== workspaceId || !Array.isArray(payload.projects) || !Array.isArray(payload.expenses)) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Payload de workspace inválido o incompleto.' },
        { status: 400, headers: getBuildHeaders() }
      );
    }

    // Validation 2: Parse and validate expectedRevision strictly
    const rawHeader = request.headers.get('If-Match');
    const rawBody = payload.expectedRevision;
    const parsedRev = parseExpectedRevision(rawHeader, rawBody);

    if (parsedRev.error || parsedRev.revision === null) {
      return NextResponse.json(
        { error: 'INVALID_EXPECTED_REVISION', message: 'La expectedRevision debe ser un entero seguro >= 1.' },
        { status: 400, headers: getBuildHeaders() }
      );
    }

    const expectedRev = parsedRev.revision;
    const redisKey = getRedisKey(workspaceId);
    const candidateUpdatedAt = Date.now();

    // Clean canonical state
    const targetState: WorkspaceState = {
      isCustomized: Boolean(payload.isCustomized),
      projects: payload.projects || [],
      expenses: payload.expenses || [],
      tasks: payload.tasks || [],
      documents: payload.documents || [],
      wikiDocs: payload.wikiDocs || [],
      categories: payload.categories || [],
      projectCategories: payload.projectCategories || [],
      batchTables: payload.batchTables || [],
      responsibles: payload.responsibles || [],
      migrationMetadata: payload.migrationMetadata
    };

    const checksum = computeStateChecksum(targetState);
    const stateJson = JSON.stringify(targetState);

    // Official Upstash REST API Pipeline execution for EVAL: [["EVAL", script, "1", key, args...]]
    const evalRes = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        [
          "EVAL",
          LUA_CAS_SCRIPT,
          "1",
          redisKey,
          String(expectedRev),
          workspaceId,
          String(candidateUpdatedAt),
          checksum,
          stateJson
        ]
      ]),
      cache: 'no-store'
    }).catch(() => null);

    if (!evalRes || !evalRes.ok) {
      const errText = evalRes ? await evalRes.text().catch(() => '') : 'fetch_null';
      const errStatus = evalRes ? evalRes.status : 0;
      return NextResponse.json(
        {
          error: 'PERSISTENCE_UNAVAILABLE',
          message: 'Fallo al ejecutar evaluación CAS en Redis.',
          evalResStatus: errStatus,
          evalResText: errText
        },
        { status: 503, headers: getBuildHeaders() }
      );
    }

    const evalData = await evalRes.json().catch(() => null);
    let casResult: any = null;
    if (Array.isArray(evalData) && evalData[0] && evalData[0].result) {
      try {
        casResult = typeof evalData[0].result === 'string' ? JSON.parse(evalData[0].result) : evalData[0].result;
      } catch (e) {}
    } else if (evalData && evalData.result) {
      try {
        casResult = typeof evalData.result === 'string' ? JSON.parse(evalData.result) : evalData.result;
      } catch (e) {}
    }

    if (!casResult || !casResult.code) {
      return NextResponse.json(
        { error: 'PERSISTENCE_UNAVAILABLE', message: 'Respuesta de CAS no válida o indeterminada.' },
        { status: 503, headers: getBuildHeaders() }
      );
    }

    // Exhaustive HTTP mapping
    if (casResult.code === 'OK') {
      const responseHeaders = getBuildHeaders({
        'X-Workspace-Revision': String(casResult.revision)
      });
      return NextResponse.json(
        {
          workspaceId: casResult.workspaceId,
          revision: casResult.revision,
          updatedAt: casResult.updatedAt,
          checksum: casResult.checksum,
          source: 'upstash'
        },
        { status: 200, headers: responseHeaders }
      );
    }

    if (casResult.code === 'CONFLICT') {
      const responseHeaders = getBuildHeaders({
        'X-Workspace-Revision': String(casResult.serverRevision)
      });
      return NextResponse.json(
        {
          error: 'WORKSPACE_CONFLICT',
          message: 'El workspace en el servidor fue modificado por otra sesión.',
          workspaceId,
          serverRevision: casResult.serverRevision,
          expectedRevision: expectedRev,
          updatedAt: casResult.updatedAt,
          checksum: casResult.checksum,
          source: 'upstash'
        },
        { status: 409, headers: responseHeaders }
      );
    }

    if (casResult.code === 'INVALID_EXPECTED_REVISION' || casResult.code === 'INVALID_STATE') {
      return NextResponse.json(
        { error: casResult.code, message: 'Parámetros o estado no válido.' },
        { status: 400, headers: getBuildHeaders() }
      );
    }

    if (casResult.code === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'WORKSPACE_NOT_FOUND', message: 'El workspace no existe.' },
        { status: 404, headers: getBuildHeaders() }
      );
    }

    if (casResult.code === 'CORRUPT_RECORD') {
      return NextResponse.json(
        { error: 'CORRUPT_RECORD', message: 'Registro corrupto detectado en el servidor.' },
        { status: 500, headers: getBuildHeaders() }
      );
    }

    return NextResponse.json(
      { error: 'PERSISTENCE_UNAVAILABLE', message: 'Resultado no reconocido del script CAS.' },
      { status: 503, headers: getBuildHeaders() }
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
