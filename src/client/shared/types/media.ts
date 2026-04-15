export type MediaType = 'video' | 'image';

export interface Media {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileType: MediaType;
  fileSize: number;
  mimeType: string | null;
  duration: number | null;
  dimensions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaListResponse {
  items: Media[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
