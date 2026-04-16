export type ScreenStatus = 'online' | 'offline';

export interface Screen {
  id: string;
  name: string;
  location: string | null;
  resolution: string | null;
  deletedAt: string | null;
  status: ScreenStatus;
  lastPing: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenInput {
  name: string;
  location?: string;
  resolution?: string;
}

export interface UpdateScreenInput {
  name?: string;
  location?: string;
  resolution?: string;
}

export interface ScreenConfig {
  id: string;
  resolution: string | null;
}
