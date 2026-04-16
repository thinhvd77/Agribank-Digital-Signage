import type { Media } from './media';

export interface PlaylistItem {
  id: string;
  profileId: string;
  mediaId: string;
  orderIndex: number;
  duration: number;
  media: Media;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistUpdateInput {
  items: Array<{
    mediaId: string;
    duration: number;
  }>;
}

export interface PlayerPlaylistItem {
  mediaId: string;
  url: string;
  type: 'video' | 'image';
  duration: number;
}
