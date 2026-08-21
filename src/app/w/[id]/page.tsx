'use client';

import React, { use } from 'react';
import Home from '../../page';

interface ShortWorkspacePageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function ShortWorkspacePage({ params }: ShortWorkspacePageProps) {
  // Support both Next.js 14 synchronous params and Next.js 15 Promise params
  const resolvedParams = typeof (params as any).then === 'function'
    ? use(params as Promise<{ id: string }>)
    : (params as { id: string });
    
  const workspaceId = resolvedParams?.id || 'rc_ws_main';

  return <Home initialWorkspaceId={workspaceId} />;
}
