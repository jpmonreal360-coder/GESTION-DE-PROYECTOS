import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

function getBlobToken(): string | null {
  const isTestEnv =
    process.env.VERCEL_ENV === 'preview' ||
    process.env.VERCEL_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL);
  let token: string | undefined;

  if (isTestEnv) {
    if (!process.env.TEST_BLOB_READ_WRITE_TOKEN) {
      throw new Error('TEST_ENVIRONMENT_VIOLATION: Falta TEST_BLOB_READ_WRITE_TOKEN en modo test. Se prohíbe el uso de credenciales de producción.');
    }
    token = process.env.TEST_BLOB_READ_WRITE_TOKEN;
  } else {
    token = process.env.BLOB_READ_WRITE_TOKEN;
  }

  if (!token) return null;
  return token.trim().replace(/^["']|["']$/g, '');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = getBlobToken();

  if (!token) {
    return NextResponse.json(
      { error: 'BLOB_NOT_CONFIGURED', message: 'BLOB_READ_WRITE_TOKEN no está configurada.' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      token,
      body,
      request,
      onBeforeGenerateToken: async (pathname: string, clientPayload: string | null) => {
        let payload: any = {};
        if (clientPayload) {
          try { payload = JSON.parse(clientPayload); } catch (e) {}
        }

        const rawWorkspaceId = payload.workspaceId;
        if (!rawWorkspaceId || typeof rawWorkspaceId !== 'string' || rawWorkspaceId.trim() === '') {
          throw new Error('WORKSPACE_ID_REQUIRED: workspaceId es requerido en clientPayload.');
        }

        const isPreviewEnv = process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'test';
        if (isPreviewEnv && (rawWorkspaceId === 'rc_ws_main' || rawWorkspaceId === 'ws_rc_ws_main')) {
          throw new Error('FORBIDDEN_PREVIEW_WORKSPACE: El acceso a workspace de producción está prohibido en entorno Preview/Test.');
        }

        const workspaceId = rawWorkspaceId.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const projectId = (payload.projectId || 'PRJ-01').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const isImage = payload.mimeType ? payload.mimeType.startsWith('image/') : false;
        const maximumSizeInBytes = isImage ? 10 * 1024 * 1024 : 20 * 1024 * 1024;

        return {
          allowedContentTypes: ALLOWED_MIME_TYPES,
          maximumSizeInBytes,
          tokenPayload: JSON.stringify({
            workspaceId,
            projectId,
            pathname
          })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('[VERCEL BLOB CLIENT UPLOAD COMPLETED]', blob.url, tokenPayload);
      }
    });

    return NextResponse.json(jsonResponse, { status: 200 });

  } catch (error: any) {
    console.error('[UPLOAD ROUTE ERROR LOG]', error.message || error);
    return NextResponse.json(
      { error: 'CLIENT_UPLOAD_TOKEN_ERROR', message: error.message || 'Error al generar token de subida.' },
      { status: 400 }
    );
  }
}
