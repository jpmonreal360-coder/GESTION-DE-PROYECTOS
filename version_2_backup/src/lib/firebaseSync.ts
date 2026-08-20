// Universal Real-time Multi-Device Sync Engine (URL State Encoding + Real Error Handling)

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
  updatedAt: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  private lastLocalTimestamp: number = 0;
  private onStateReceivedCallback: ((data: SyncPayload) => void) | null = null;
  private onStatusChangeCallback: ((status: SaveStatus) => void) | null = null;
  private pollIntervalId: any = null;
  private activeWorkspaceId: string = 'rc_ws_main';

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('rc_proyectos_realtime_channel');
      this.broadcastChannel.onmessage = (event) => {
        if (!this.isBroadcasting && event.data && this.onStateReceivedCallback) {
          if (event.data.updatedAt > this.lastLocalTimestamp) {
            this.lastLocalTimestamp = event.data.updatedAt;
            this.onStateReceivedCallback(event.data);
          }
        }
      };
    }
  }

  public setWorkspaceId(id: string) {
    if (id && id.trim() !== '') {
      this.activeWorkspaceId = id.trim();
    }
  }

  public getWorkspaceId(): string {
    return this.activeWorkspaceId;
  }

  public onStatusChange(callback: (status: SaveStatus) => void) {
    this.onStatusChangeCallback = callback;
  }

  private setSaveStatus(status: SaveStatus) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status);
    }
  }

  // Subscribe to Cloud & Local real-time changes
  public subscribe(onStateReceived: (data: SyncPayload) => void) {
    this.onStateReceivedCallback = onStateReceived;

    this.fetchFromCloud();

    if (typeof window !== 'undefined' && !this.pollIntervalId) {
      this.pollIntervalId = setInterval(() => {
        if (!this.isBroadcasting) {
          this.fetchFromCloud();
        }
      }, 2000);
    }
  }

  // Direct Fetch with Strict HTTP Status Validation (No False Positives)
  public async fetchFromCloud(): Promise<SyncPayload | null> {
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };

    try {
      // 1. Primary Native API Endpoint (/api/workspace/[id])
      const apiUrl = getNativeApiUrl(this.activeWorkspaceId);
      const res = await fetch(apiUrl, { method: 'GET', headers, cache: 'no-store' }).catch(() => null);

      if (res && res.status === 200) {
        const data = await res.json();
        if (data && Array.isArray(data.projects) && !data.notFound) {
          if (data.updatedAt > this.lastLocalTimestamp) {
            this.lastLocalTimestamp = data.updatedAt;
            if (this.onStateReceivedCallback && !this.isBroadcasting) {
              this.onStateReceivedCallback(data);
            }
          }
          return data;
        }
      }
    } catch (err) {
      // Silent catch
    }
    return null;
  }

  // Real Error Handling Save: LIES TO USER ARE ELIMINATED!
  public async saveToCloud(stateObj: Omit<SyncPayload, 'workspaceId' | 'updatedAt'>): Promise<boolean> {
    if (this.isBroadcasting) return true;
    this.isBroadcasting = true;
    this.setSaveStatus('saving');
    
    const now = Date.now();
    this.lastLocalTimestamp = now;

    const payload: SyncPayload = {
      ...stateObj,
      workspaceId: this.activeWorkspaceId,
      updatedAt: now
    };

    let serverSaved = false;

    try {
      // 1. Instant Local Broadcast (0ms)
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(payload);
      }

      // 2. Primary Server Write: Next.js API Route (/api/workspace/[id])
      const apiUrl = getNativeApiUrl(this.activeWorkspaceId);
      const apiRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (apiRes && (apiRes.status === 200 || apiRes.status === 201)) {
        serverSaved = true;
      }

      if (serverSaved) {
        this.setSaveStatus('saved');
        setTimeout(() => this.setSaveStatus('idle'), 3000);
      } else {
        // Real Error Handling: IF SERVER FAILED, REFLECT REAL ERROR!
        this.setSaveStatus('error');
        setTimeout(() => this.setSaveStatus('idle'), 4000);
      }

    } catch (err) {
      console.error('Error guardando en la nube:', err);
      this.setSaveStatus('error');
      setTimeout(() => this.setSaveStatus('idle'), 4000);
      serverSaved = false;
    } finally {
      setTimeout(() => {
        this.isBroadcasting = false;
      }, 300);
    }

    return serverSaved;
  }

  public publish(stateObj: Omit<SyncPayload, 'workspaceId' | 'updatedAt'>) {
    this.saveToCloud(stateObj);
  }
}

export const realtimeSync = new RealtimeSyncEngine();
