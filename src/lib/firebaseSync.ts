// Universal Real-time Multi-Device Sync Engine (Cloud-First & Concurrency Protected)

export interface SyncPayload {
  workspaceId: string;
  isCustomized: boolean;
  projects: any[];
  expenses: any[];
  tasks: any[];
  documents: any[];
  wikiDocs: any[];
  categories: any[];
  projectCategories: any[];
  batchTables?: any[];
  updatedAt: number;
  revision?: number;
  expectedRevision?: number;
  schemaVersion?: number;
  checksum?: string;
  source?: string;
}

export type SaveStatus =
  | 'idle'
  | 'loading-remote'
  | 'ready'
  | 'saving'
  | 'saved'
  | 'offline-readonly'
  | 'conflict'
  | 'error';

export interface ConflictDetails {
  serverRevision: number;
  expectedRevision: number;
  updatedAt: number;
  checksum?: string;
}

// URL-Safe Encoder & Decoder
export const urlSafeEncodeObj = (obj: any): string => {
  const jsonStr = JSON.stringify(obj);
  const base64 = btoa(encodeURIComponent(jsonStr));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const urlSafeDecodeStr = (str: string): any => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const jsonStr = decodeURIComponent(atob(base64));
  return JSON.parse(jsonStr);
};

const getNativeApiUrl = (wsId: string) => `/api/workspace/${encodeURIComponent(wsId)}`;

class RealtimeSyncEngine {
  private broadcastChannel: BroadcastChannel | null = null;
  private isBroadcasting: boolean = false;
  private lastRemoteTimestamp: number = 0;
  private lastRemoteRevision: number = 1;
  private currentStatus: SaveStatus = 'idle';
  private onStateReceivedCallback: ((data: SyncPayload) => void) | null = null;
  private onStatusChangeCallback: ((status: SaveStatus, conflict?: ConflictDetails) => void) | null = null;
  private pollIntervalId: number | null = null;
  private activeWorkspaceId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('rc_proyectos_realtime_channel');
      this.broadcastChannel.onmessage = (event) => {
        if (!this.isBroadcasting && event.data && this.onStateReceivedCallback) {
          const remoteRev = Number(event.data.revision || 0);
          const remoteTs = Number(event.data.updatedAt || 0);
          if (remoteRev > this.lastRemoteRevision || (remoteRev === this.lastRemoteRevision && remoteTs > this.lastRemoteTimestamp)) {
            this.lastRemoteTimestamp = remoteTs;
            if (remoteRev > 0) this.lastRemoteRevision = remoteRev;
            this.onStateReceivedCallback(event.data);
          }
        }
      };
    }
  }

  public setWorkspaceId(id: string) {
    if (!id || typeof id !== 'string' || id.trim() === '') return;
    const trimmed = id.trim();

    const isPreviewOrTest =
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
      process.env.NODE_ENV === 'test' ||
      (typeof window !== 'undefined' && (window.location.host.includes('-test') || window.location.hash.includes('rc_ws_test')));

    if (isPreviewOrTest && (trimmed === 'rc_ws_main' || trimmed === 'ws_rc_ws_main')) {
      console.warn(`[REALTIME SYNC GUARD] Intento de usar workspace productivo (${trimmed}) en entorno Preview/Test. Redirigiendo a rc_ws_test.`);
      this.activeWorkspaceId = 'rc_ws_test';
      return;
    }

    this.activeWorkspaceId = trimmed;
  }

  public getWorkspaceId(): string | null {
    return this.activeWorkspaceId;
  }

  public getRevision(): number {
    return this.lastRemoteRevision;
  }

  public setLastRemoteTimestamp(ts: number) {
    if (ts > this.lastRemoteTimestamp) {
      this.lastRemoteTimestamp = ts;
    }
  }

  public setLastRemoteRevision(rev: number) {
    if (rev > this.lastRemoteRevision) {
      this.lastRemoteRevision = rev;
    }
  }

  public onStatusChange(callback: (status: SaveStatus, conflict?: ConflictDetails) => void) {
    this.onStatusChangeCallback = callback;
  }

  private setSaveStatus(status: SaveStatus, conflict?: ConflictDetails) {
    this.currentStatus = status;
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status, conflict);
    }
  }

  public getStatus(): SaveStatus {
    return this.currentStatus;
  }

  // Subscribe to Cloud changes with strictly read-only polling
  public subscribe(onStateReceived: (data: SyncPayload) => void): () => void {
    this.onStateReceivedCallback = onStateReceived;

    if (this.activeWorkspaceId) {
      void this.fetchFromCloud();
    }

    if (!this.pollIntervalId && typeof window !== 'undefined') {
      this.pollIntervalId = window.setInterval(() => {
        if (this.activeWorkspaceId && !this.isBroadcasting && this.currentStatus !== 'conflict') {
          void this.fetchFromCloud();
        }
      }, 3000);
    }

    return () => {
      this.onStateReceivedCallback = null;
      if (this.pollIntervalId) {
        window.clearInterval(this.pollIntervalId);
        this.pollIntervalId = null;
      }
    };
  }

  // Direct Anti-Cache Read targeting workspaceId API Route
  public async fetchFromCloud(): Promise<SyncPayload | null> {
    if (!this.activeWorkspaceId) {
      return null;
    }

    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    try {
      const apiUrl = getNativeApiUrl(this.activeWorkspaceId);
      const res = await fetch(apiUrl, { method: 'GET', headers, cache: 'no-store' }).catch(() => null);

      if (res) {
        if (res.status === 503) {
          this.setSaveStatus('offline-readonly');
          return null;
        }

        if (res.status === 200) {
          const data = await res.json();
          if (data && data.notFound) {
            return null;
          }

          if (data && Array.isArray(data.projects)) {
            const remoteTs = Number(data.updatedAt || 0);
            const remoteRev = Number(data.revision || 1);

            if (remoteRev > this.lastRemoteRevision || (remoteRev === this.lastRemoteRevision && remoteTs > this.lastRemoteTimestamp)) {
              this.lastRemoteTimestamp = remoteTs;
              this.lastRemoteRevision = remoteRev;
              if (this.onStateReceivedCallback && !this.isBroadcasting) {
                this.onStateReceivedCallback(data);
              }
            }
            if (this.currentStatus === 'loading-remote' || this.currentStatus === 'offline-readonly') {
              this.setSaveStatus('ready');
            }
            return data;
          }
        }
      }
    } catch (err) {
      console.warn('Error en fetchFromCloud:', err);
      this.setSaveStatus('offline-readonly');
    }
    return null;
  }

  // Explicit Save to Cloud with Monotonic Revision Check & 409 Conflict Protection
  public async saveToCloud(stateObj: Omit<SyncPayload, 'workspaceId' | 'updatedAt'>): Promise<{ success: boolean; conflict?: boolean; offline?: boolean }> {
    if (!this.activeWorkspaceId || this.isBroadcasting || this.currentStatus === 'offline-readonly') {
      return { success: false, offline: this.currentStatus === 'offline-readonly' };
    }

    this.isBroadcasting = true;
    this.setSaveStatus('saving');

    const now = Math.max(Date.now(), this.lastRemoteTimestamp + 1);
    const expectedRevision = this.lastRemoteRevision;

    const payload: SyncPayload = {
      ...stateObj,
      workspaceId: this.activeWorkspaceId,
      expectedRevision,
      updatedAt: now
    };

    let serverSaved = false;

    try {
      // 1. Instant Local Broadcast across browser tabs (0ms)
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(payload);
      }

      // 2. Primary Server CAS Write
      const apiUrl = getNativeApiUrl(this.activeWorkspaceId);
      const apiRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': `"${expectedRevision}"`
        },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (apiRes) {
        if (apiRes.status === 409) {
          // CONFLICT DETECTED: Lightweight 409 response
          const conflictData: ConflictDetails = await apiRes.json().catch(() => ({
            serverRevision: expectedRevision + 1,
            expectedRevision,
            updatedAt: now
          }));

          this.setSaveStatus('conflict', conflictData);
          return { success: false, conflict: true };
        }

        if (apiRes.status === 503) {
          this.setSaveStatus('offline-readonly');
          return { success: false, offline: true };
        }

        if (apiRes.status === 200 || apiRes.status === 201) {
          const resData = await apiRes.json().catch(() => null);
          if (resData && Array.isArray(resData.projects)) {
            serverSaved = true;
            const serverTs = Number(resData.updatedAt || now);
            const serverRev = Number(resData.revision || expectedRevision + 1);
            this.lastRemoteTimestamp = Math.max(this.lastRemoteTimestamp, serverTs);
            this.lastRemoteRevision = Math.max(this.lastRemoteRevision, serverRev);
          }
        }
      }

      if (serverSaved) {
        this.setSaveStatus('saved');
        setTimeout(() => {
          if (this.currentStatus === 'saved') this.setSaveStatus('ready');
        }, 3000);
        return { success: true };
      } else {
        this.setSaveStatus('error');
        setTimeout(() => {
          if (this.currentStatus === 'error') this.setSaveStatus('ready');
        }, 4000);
        return { success: false };
      }

    } catch (err) {
      console.error('Error guardando en la nube:', err);
      this.setSaveStatus('error');
      setTimeout(() => {
        if (this.currentStatus === 'error') this.setSaveStatus('ready');
      }, 4000);
      return { success: false };
    } finally {
      setTimeout(() => {
        this.isBroadcasting = false;
      }, 300);
    }
  }

  // Pre-mutation backup helper before bulk/destructive operations
  public async createPreMutationBackup(reason: string): Promise<boolean> {
    if (!this.activeWorkspaceId) return false;
    try {
      const backupUrl = `/api/workspace/${encodeURIComponent(this.activeWorkspaceId)}/backups`;
      const res = await fetch(backupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      }).catch(() => null);

      if (res && (res.status === 200 || res.status === 201)) {
        const data = await res.json().catch(() => null);
        return Boolean(data && data.success);
      }
    } catch (e) {
      console.warn('Fallo al crear backup previo:', e);
    }
    return false;
  }

  public publish(stateObj: Omit<SyncPayload, 'workspaceId' | 'updatedAt'>) {
    void this.saveToCloud(stateObj);
  }
}

export const realtimeSync = new RealtimeSyncEngine();
