import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@shared/hooks/useApi';
import { useDialog } from '@shared/hooks/useDialog';
import { extractVideoDuration } from '@shared/utils/videoDuration';
import type { Media, MediaListResponse, UserRole } from '@shared/types';

interface Props {
  token: string;
  userRole: UserRole;
  selectedProfileId: string | null;
  onAddToPlaylist?: (media: Media) => void;
  onSelectProfile?: () => void;
}

export default function MediaLibrary({ token, userRole, selectedProfileId, onAddToPlaylist, onSelectProfile }: Props) {
  const { fetchApi, headers } = useApi(token);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<Media | null>(null);
  const { error, success, confirm } = useDialog();

  useEffect(() => {
    if (!previewMedia) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewMedia(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewMedia]);

  const { data, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => fetchApi<MediaListResponse>('/api/media'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/media/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    if (file.type.startsWith('video/')) {
      try {
        const duration = await extractVideoDuration(file);
        formData.append('duration', String(duration));
      } catch {
        // Extraction failed — upload anyway, auto-extract will retry later
      }
    }

    try {
      await fetch('/api/media/upload', {
        method: 'POST',
        headers: { Authorization: headers.Authorization },
        body: formData,
      });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    } catch (err) {
      error('Tải lên thất bại', 'Không thể tải file lên hệ thống. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Auto back-fill duration for videos uploaded before this feature existed.
  // Track attempted IDs so we don't loop on videos that fail extraction.
  const attemptedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const items = data?.items;
    if (!items) return;

    const pending = items.filter(
      (m) => m.fileType === 'video' && m.duration == null && !attemptedRef.current.has(m.id)
    );
    if (pending.length === 0) return;

    let cancelled = false;
    (async () => {
      let updated = false;
      for (const media of pending) {
        if (cancelled) return;
        attemptedRef.current.add(media.id);
        try {
          const duration = await extractVideoDuration(media.filePath);
          await fetchApi(`/api/media/${media.id}/duration`, {
            method: 'PATCH',
            body: JSON.stringify({ duration }),
          });
          updated = true;
        } catch {
          // Skip; will not retry this session
        }
      }
      if (updated && !cancelled) {
        queryClient.invalidateQueries({ queryKey: ['media'] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data, fetchApi, queryClient]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Thư viện media</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-agribank-green text-white px-4 py-2 rounded hover:bg-agribank-dark disabled:opacity-50"
          >
            {uploading ? 'Đang tải lên...' : 'Tải lên Media'}
          </button>
        </div>
      </div>

      <div>
        {isLoading ? (
          <p className="text-gray-500">Đang tải...</p>
        ) : (
          <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {data?.items.map((media) => (
              <div
                key={media.id}
                className="border rounded-lg overflow-hidden group relative"
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {media.fileType === 'video' ? (
                    <video
                      src={media.filePath}
                      className="w-full h-full object-cover cursor-pointer"
                      muted
                      playsInline
                      preload="metadata"
                      onClick={() => setPreviewMedia(media)}
                    />
                  ) : (
                    <img
                      src={media.filePath}
                      alt={media.originalName}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setPreviewMedia(media)}
                    />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-sm truncate" title={media.originalName}>
                    {media.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {media.fileType} - {formatSize(media.fileSize)}
                  </p>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPreviewMedia(media)}
                    className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-900 transition-colors"
                  >
                    Xem trước
                  </button>
                  {onAddToPlaylist && (
                    <button
                      onClick={() => {
                        if (!selectedProfileId) {
                          onSelectProfile?.();
                          return;
                        }
                        onAddToPlaylist(media);
                      }}
                      className="bg-agribank-green text-white px-3 py-1 rounded text-sm hover:bg-agribank-dark transition-colors"
                    >
                      Thêm
                    </button>
                  )}
                  {userRole === 'admin' && (
                    <button
                      onClick={async () => {
                        const shouldDelete = await confirm({
                          title: 'Xóa media',
                          message: `Bạn có chắc chắn muốn xóa "${media.originalName}"? Hành động này không thể hoàn tác.`,
                          confirmText: 'Xóa',
                          cancelText: 'Hủy',
                          variant: 'error',
                        });
                        if (shouldDelete) {
                          deleteMutation.mutate(media.id);
                          success('Đã xóa', 'Media đã được xóa thành công');
                        }
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Media preview"
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-5xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
              <p className="font-medium truncate" title={previewMedia.originalName}>
                {previewMedia.originalName}
              </p>
              <button
                onClick={() => setPreviewMedia(null)}
                className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded"
              >
                Đóng
              </button>
            </div>
            <div className="bg-black">
              {previewMedia.fileType === 'video' ? (
                <video
                  key={previewMedia.id}
                  src={previewMedia.filePath}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[75vh]"
                />
              ) : (
                <img
                  key={previewMedia.id}
                  src={previewMedia.filePath}
                  alt={previewMedia.originalName}
                  className="w-full max-h-[75vh] object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
