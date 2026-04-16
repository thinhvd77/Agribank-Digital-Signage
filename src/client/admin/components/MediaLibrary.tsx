import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@shared/hooks/useApi';
import { useDialog } from '@shared/hooks/useDialog';
import type { Media, MediaListResponse } from '@shared/types';

interface Props {
  token: string;
  selectedProfileId: string | null;
  onAddToPlaylist?: (media: Media) => void;
  onSelectProfile?: () => void;
}

export default function MediaLibrary({ token, selectedProfileId, onAddToPlaylist, onSelectProfile }: Props) {
  const { fetchApi, headers } = useApi(token);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { error, success, confirm } = useDialog();

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

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg border p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Media Library</h2>
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
            className="bg-agribank-green text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Media'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
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
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={media.filePath}
                      alt={media.originalName}
                      className="w-full h-full object-cover"
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
                  {onAddToPlaylist && (
                    <button
                      onClick={() => {
                        if (!selectedProfileId) {
                          onSelectProfile?.();
                          return;
                        }
                        onAddToPlaylist(media);
                      }}
                      className="bg-agribank-green text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      Add
                    </button>
                  )}
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
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
