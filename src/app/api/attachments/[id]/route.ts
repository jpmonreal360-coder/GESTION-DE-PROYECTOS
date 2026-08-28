import { NextRequest, NextResponse } from 'next/server';
import { processGetAttachment } from '@/lib/getAttachment';
import { getPendingUpload } from '@/lib/pendingUploads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const attachmentId = params.id;

  if (!attachmentId) {
    return NextResponse.json(
      { error: 'MISSING_ATTACHMENT_ID', message: 'attachmentId es requerido en la ruta.' },
      { status: 400 }
    );
  }

  try {
    const clientStorageKeyOverride = request.nextUrl.searchParams.get('storageKey');

    // Resolve storageKey strictly server-side from server registry
    const record = await getPendingUpload(attachmentId);
    let resolvedStorageKey = record?.storageKey;



    if (!resolvedStorageKey) {
      return NextResponse.json(
        { error: 'ATTACHMENT_NOT_FOUND', message: 'El id de adjunto no existe o no tiene un storageKey autorizado.' },
        { status: 404 }
      );
    }

    // Reject mismatched client query parameters
    if (clientStorageKeyOverride && clientStorageKeyOverride !== resolvedStorageKey) {
      return NextResponse.json(
        { error: 'INVALID_STORAGE_KEY_MISMATCH', message: 'El storageKey del cliente no coincide con la identidad del servidor.' },
        { status: 403 }
      );
    }

    return await processGetAttachment({ storageKey: resolvedStorageKey });

  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Error al transmitir adjunto privado.' },
      { status: 500 }
    );
  }
}
