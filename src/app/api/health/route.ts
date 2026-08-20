import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'local-dev';
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || 'local-dev';

  return NextResponse.json(
    {
      status: 'ok',
      commit,
      deploymentId,
      timestamp: Date.now()
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-App-Build': commit,
        'X-Commit-SHA': commit,
        'X-Deployment-Id': deploymentId
      }
    }
  );
}
