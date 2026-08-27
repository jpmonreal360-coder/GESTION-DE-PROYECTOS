'use client';

import React, { useEffect, useState } from 'react';
import Home from '../../page';

interface ShortWorkspacePageProps {
  params: { id: string } | Promise<{ id: string }>;
}

export default function ShortWorkspacePage({ params }: ShortWorkspacePageProps) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const isPreviewOrTest =
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
      process.env.NODE_ENV === 'test' ||
      (typeof window !== 'undefined' && (window.location.host.includes('-test') || window.location.hash.includes('rc_ws_test')));

    if (params) {
      const applyResolvedId = (rawId: string) => {
        if (!rawId) return;
        if (isPreviewOrTest && (rawId === 'rc_ws_main' || rawId === 'ws_rc_ws_main')) {
          setWorkspaceId('rc_ws_test');
        } else {
          setWorkspaceId(rawId);
        }
      };

      if (typeof (params as any).then === 'function') {
        (params as Promise<{ id: string }>).then((res) => {
          if (res?.id) applyResolvedId(res.id);
        });
      } else if ((params as { id: string }).id) {
        applyResolvedId((params as { id: string }).id);
      }
    }
  }, [params]);

  return <Home />;
}
