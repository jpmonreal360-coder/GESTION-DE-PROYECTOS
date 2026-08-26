import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export interface GetAttachmentParams {
  storageKey: string;
}

export interface BlobStreamFetcher {
  (storageKey: string): Promise<{ ok: boolean; status: number; contentType?: string; contentLength?: string; buffer?: Buffer }>;
}

export async function processGetAttachment(
  params: GetAttachmentParams,
  blobFetcher?: BlobStreamFetcher,
  tokenOverride?: string
): Promise<NextResponse> {
  const { storageKey } = params;

  if (!storageKey || typeof storageKey !== 'string') {
    return NextResponse.json(
      { error: 'MISSING_STORAGE_KEY', message: 'storageKey es requerido.' },
      { status: 400 }
    );
  }

  // Enforce namespace check: storageKey MUST start with workspaces/
  if (!storageKey.startsWith('workspaces/')) {
    return NextResponse.json(
      { error: 'INVALID_STORAGE_KEY_NAMESPACE', message: 'storageKey fuera del namespace autorizado.' },
      { status: 403 }
    );
  }

  if (blobFetcher) {
    const blobRes = await blobFetcher(storageKey);
    if (!blobRes.ok || !blobRes.buffer) {
      return NextResponse.json(
        { error: 'OBJECT_NOT_FOUND', message: 'Adjunto no encontrado o sin acceso.' },
        { status: blobRes.status === 404 ? 404 : 502 }
      );
    }

    const safeFileName = storageKey.split('/').pop() || 'file';
    const contentType = blobRes.contentType || 'application/octet-stream';
    const contentLength = blobRes.contentLength || String(blobRes.buffer.length);

    return new NextResponse(new Uint8Array(blobRes.buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength,
        'Cache-Control': 'private, max-age=3600, must-revalidate',
        'Content-Disposition': `inline; filename="${safeFileName}"`
      }
    });
  }

  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL);
  let blobToken: string | undefined;

  if (isTestEnv) {
    if (!process.env.TEST_BLOB_READ_WRITE_TOKEN) {
      throw new Error('TEST_ENVIRONMENT_VIOLATION: Falta TEST_BLOB_READ_WRITE_TOKEN en modo test. Se prohíbe el uso de credenciales de producción.');
    }
    blobToken = tokenOverride || process.env.TEST_BLOB_READ_WRITE_TOKEN;
  } else {
    blobToken = tokenOverride || process.env.BLOB_READ_WRITE_TOKEN;
  }

  if (!blobToken) {
    return NextResponse.json(
      { error: 'BLOB_NOT_CONFIGURED', message: 'BLOB_READ_WRITE_TOKEN no está configurada.' },
      { status: 503 }
    );
  }

  try {
    // Official @vercel/blob 2.8.0 SDK get() function
    const getResult = await get(storageKey, {
      access: 'private',
      token: blobToken
    });

    if (!getResult || getResult.statusCode !== 200 || !getResult.stream) {
      return NextResponse.json(
        { error: 'OBJECT_NOT_FOUND', message: 'Adjunto no encontrado o sin acceso.' },
        { status: getResult === null ? 404 : 502 }
      );
    }

    const safeFileName = storageKey.split('/').pop() || 'file';
    const contentType = getResult.blob.contentType || 'application/octet-stream';
    const contentLength = String(getResult.blob.size || '');

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600, must-revalidate',
      'Content-Disposition': `inline; filename="${safeFileName}"`
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    // Stream binary stream from Vercel Blob Private Store directly to browser via NextResponse
    return new NextResponse(getResult.stream as any, {
      status: 200,
      headers: responseHeaders
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Error al transmitir adjunto privado.' },
      { status: 500 }
    );
  }
}
