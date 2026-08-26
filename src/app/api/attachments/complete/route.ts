import { NextRequest, NextResponse } from 'next/server';
import { processCompleteAttachment } from '@/lib/completeAttachment';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBlobToken(): string | null {
  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.TEST_UPSTASH_REDIS_REST_URL);
  const token = isTestEnv
    ? (process.env.TEST_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN)
    : process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  return token.trim().replace(/^["']|["']$/g, '');
}

export async function POST(request: NextRequest) {
  const token = getBlobToken();

  if (!token) {
    return NextResponse.json(
      { error: 'BLOB_NOT_CONFIGURED', message: 'BLOB_READ_WRITE_TOKEN no está configurada.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    const fetcher = async (storageKey: string) => {
      const blobEndpoint = `https://blob.vercel-storage.com/${storageKey}`;
      const fetchBlobRes = await fetch(blobEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-version': '7'
        },
        cache: 'no-store'
      });

      if (!fetchBlobRes.ok) {
        return { ok: false, status: fetchBlobRes.status };
      }

      const arrayBuffer = await fetchBlobRes.arrayBuffer();
      return { ok: true, status: 200, buffer: Buffer.from(arrayBuffer) };
    };

    const result = await processCompleteAttachment(body, fetcher);
    return NextResponse.json(result.body, { status: result.status });

  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message || 'Error interno en complete.' },
      { status: 500 }
    );
  }
}
