import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getWebhookPublicKey(): string | null {
  const key = process.env.BLOB_WEBHOOK_PUBLIC_KEY || process.env.BLOB_READ_WRITE_TOKEN;
  if (!key) return null;
  return key.trim().replace(/^["']|["']$/g, '');
}

function verifyWebhookSignature(payloadText: string, signatureHeader: string | null, publicKey: string): boolean {
  if (!signatureHeader || !publicKey) return false;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', publicKey)
      .update(payloadText)
      .digest('hex');

    const cleanSignature = signatureHeader.replace(/^v1=/, '').trim();
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (e) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const publicKey = getWebhookPublicKey();
  const signatureHeader = request.headers.get('x-vercel-signature');
  const payloadText = await request.text().catch(() => '');

  if (!publicKey || !signatureHeader) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Firma x-vercel-signature requerida o clave de webhook ausente.' },
      { status: 401 }
    );
  }

  const isValid = verifyWebhookSignature(payloadText, signatureHeader, publicKey);

  if (!isValid) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Firma x-vercel-signature no válida.' },
      { status: 401 }
    );
  }

  try {
    const event = JSON.parse(payloadText || '{}');
    console.log('[BLOB WEBHOOK AUDIT] Evento recibido y autenticado:', event.type || 'blob.event');

    return NextResponse.json(
      {
        received: true,
        type: event.type || 'blob.event',
        timestamp: Date.now()
      },
      { status: 200 }
    );

  } catch (err: any) {
    return NextResponse.json(
      { error: 'INVALID_PAYLOAD', message: 'Payload JSON de webhook malformado.' },
      { status: 400 }
    );
  }
}
