'use client';

import React, { useEffect, useState } from 'react';
import Home from '../../page';

interface ShortWorkspacePageProps {
  params: { id: string } | Promise<{ id: string }>;
}

export default function ShortWorkspacePage({ params }: ShortWorkspacePageProps) {
  const [workspaceId, setWorkspaceId] = useState<string>('rc_ws_main');

  useEffect(() => {
    if (params) {
      if (typeof (params as any).then === 'function') {
        (params as Promise<{ id: string }>).then((res) => {
          if (res?.id) setWorkspaceId(res.id);
        });
      } else if ((params as { id: string }).id) {
        setWorkspaceId((params as { id: string }).id);
      }
    }
  }, [params]);

  return <Home />;
}
