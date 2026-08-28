import crypto from 'crypto';
import { get } from '@vercel/blob';
import { AttachmentRef } from '@/types';
import { registerPendingUpload, markPendingUploadCompleted } from '@/lib/pendingUploads';

export function validateMagicNumber(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  const hex = buffer.toString('hex', 0, 16);

  if (mimeType === 'application/pdf') {
    return buffer.toString('ascii', 0, 5) === '%PDF-';
  }
  if (mimeType === 'image/jpeg') {
    return hex.startsWith('ffd8ff');
  }
  if (mimeType === 'image/png') {
    return hex.startsWith('89504e470d0a1a0a');
  }
  if (mimeType === 'image/webp') {
    const riff = buffer.toString('ascii', 0, 4) === 'RIFF';
    const webp = buffer.toString('ascii', 8, 12) === 'WEBP';
    return riff && webp;
  }
  if (mimeType === 'image/heic') {
    return buffer.toString('ascii', 4, 8) === 'ftyp';
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return hex.startsWith('504b0304');
  }
  if (mimeType === 'application/msword' || mimeType === 'application/vnd.ms-excel') {
    return hex.startsWith('d0cf11e0') || hex.startsWith('504b0304');
  }

  return false;
}

export interface CompleteParams {
  uploadId: string;
  storageKey: string;
  workspaceId: string;
  projectId: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  fileName: string;
}

export interface BlobObjectFetcher {
  (storageKey: string): Promise<{ ok: boolean; status: number; buffer?: Buffer }>;
}

export async function processCompleteAttachment(
  params: CompleteParams,
  blobFetcher?: BlobObjectFetcher,
  tokenOverride?: string
): Promise<{ status: number; body: { error?: string; message?: string; success?: boolean; attachment?: AttachmentRef } }> {
  const { uploadId, storageKey, workspaceId, projectId, mimeType, byteSize, sha256, fileName } = params;

  if (!uploadId || !storageKey || !workspaceId || !projectId || !mimeType || !byteSize || !sha256 || !fileName) {
    return { status: 400, body: { error: 'MISSING_FIELDS', message: 'Faltan campos requeridos en la petición complete.' } };
  }

  // STRICT Namespace Check: MUST start with workspaces/${safeWorkspace}/projects/${safeProject}/ (NO BYPASS!)
  const safeWorkspace = workspaceId.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const safeProject = projectId.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const expectedPrefix = `workspaces/${safeWorkspace}/projects/${safeProject}/`;

  if (!storageKey.startsWith(expectedPrefix)) {
    return { status: 403, body: { error: 'INVALID_STORAGE_KEY_NAMESPACE', message: 'storageKey fuera del namespace autorizado.' } };
  }

  // Register pending upload in Redis (non-blocking)
  try {
    await registerPendingUpload({
      uploadId,
      storageKey,
      workspaceId,
      projectId,
      createdAt: Date.now(),
      completed: false
    });
  } catch (err: any) {
    console.error('[PENDING UPLOADS REGISTRY WARNING] Register failed:', err.message || err);
  }

  // Retrieve object from Private Blob Store using official SDK get() or injected fetcher
  let objectBuffer: Buffer | null = null;
  let fetchStatus = 502;

  if (blobFetcher) {
    const res = await blobFetcher(storageKey);
    fetchStatus = res.status;
    if (res.ok && res.buffer) {
      objectBuffer = res.buffer;
    }
  } else {
    const isTestEnv =
      process.env.VERCEL_ENV === 'preview' ||
      process.env.VERCEL_ENV === 'development' ||
      process.env.NODE_ENV === 'test' ||
      Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL);
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
      return { status: 503, body: { error: 'BLOB_NOT_CONFIGURED', message: 'BLOB_READ_WRITE_TOKEN no está configurada.' } };
    }

    try {
      // Official @vercel/blob 2.8.0 SDK get() function
      const getResult = await get(storageKey, {
        access: 'private',
        token: blobToken
      });

      if (getResult && getResult.statusCode === 200 && getResult.stream) {
        const streamResponse = new Response(getResult.stream as any);
        const arrayBuffer = await streamResponse.arrayBuffer();
        objectBuffer = Buffer.from(arrayBuffer);
      } else {
        fetchStatus = getResult === null ? 404 : 502;
      }
    } catch (err: any) {
      console.error('[VERCEL BLOB GET ERROR]', err.message || err);
      fetchStatus = err.status || 502;
    }
  }

  // STRICT ABORT: If object buffer cannot be fetched from private store, ABORT IMMEDIATELY! NO AttachmentRef CREATED!
  if (!objectBuffer) {
    return {
      status: fetchStatus === 404 ? 404 : 502,
      body: { error: 'OBJECT_NOT_FOUND', message: 'El objeto subido no se pudo descargar del Vercel Private Storage para verificación.' }
    };
  }

  // Verify size match
  if (objectBuffer.length !== Number(byteSize)) {
    return {
      status: 400,
      body: { error: 'SIZE_MISMATCH', message: `El tamaño del objeto en Blob (${objectBuffer.length}) no coincide con el reportado (${byteSize}).` }
    };
  }

  // Real Server SHA-256 Calculation & Verification over Binary Buffer
  const serverSha256 = crypto.createHash('sha256').update(objectBuffer).digest('hex');
  if (serverSha256 !== sha256) {
    return {
      status: 400,
      body: { error: 'SHA256_MISMATCH', message: `El SHA-256 real del objeto (${serverSha256}) no coincide con el hash del cliente (${sha256}).` }
    };
  }

  // Binary Signature (Magic Number) Verification
  const isMagicValid = validateMagicNumber(objectBuffer, mimeType);
  if (!isMagicValid) {
    return {
      status: 400,
      body: { error: 'MAGIC_NUMBER_MISMATCH', message: 'La firma binaria del objeto subido no coincide con el tipo MIME declarado.' }
    };
  }

  // Mark completed in Redis (non-blocking)
  try {
    await markPendingUploadCompleted(uploadId, { storageKey, workspaceId, projectId });
  } catch (err: any) {
    console.error('[PENDING UPLOADS REGISTRY WARNING] Mark complete failed:', err.message || err);
  }

  const attachment: AttachmentRef = {
    id: uploadId,
    workspaceId,
    projectId,
    storageKey,
    fileName,
    mimeType,
    byteSize: Number(byteSize),
    sha256: serverSha256,
    createdAt: Date.now(),
    status: 'uploaded'
  };

  return {
    status: 200,
    body: {
      success: true,
      attachment
    }
  };
}
