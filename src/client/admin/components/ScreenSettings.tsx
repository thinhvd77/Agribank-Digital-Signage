import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@shared/hooks/useApi';
import type { Screen } from '@shared/types';
import { isValidResolutionString } from '@shared/utils/resolution';

interface Props {
  token: string;
  screenId: string;
}

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

export default function ScreenSettings({ token, screenId }: Props) {
  const { fetchApi } = useApi(token);
  const queryClient = useQueryClient();
  const [resolutionInput, setResolutionInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [copied, setCopied] = useState(false);

  const playerUrl = `${window.location.origin}/player.html?screen=${screenId}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(playerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g., non-HTTPS context) — user can select & copy manually
    }
  };

  const {
    data: screen,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['screen', screenId],
    queryFn: () => fetchApi<Screen>(`/api/screens/${screenId}`),
  });

  useEffect(() => {
    if (!screen) return;
    setResolutionInput(screen.resolution ?? '');
    setFeedback(null);
  }, [screen]);

  const normalizedResolution = resolutionInput.trim().toLowerCase();

  const resolutionError = useMemo(() => {
    if (!normalizedResolution) return null;
    if (isValidResolutionString(normalizedResolution)) return null;
    return 'Độ phân giải phải theo định dạng WxH, ví dụ: 1920x1080.';
  }, [normalizedResolution]);

  const hasChanges = (screen?.resolution ?? '') !== (normalizedResolution || '');

  const saveMutation = useMutation({
    mutationFn: async () => {
      await fetchApi<Screen>(`/api/screens/${screenId}`, {
        method: 'PUT',
        body: JSON.stringify({
          resolution: normalizedResolution || null,
        }),
      });
    },
    onSuccess: () => {
      setFeedback({
        type: 'success',
        message: 'Độ phân giải đã được lưu thành công.',
      });
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      queryClient.invalidateQueries({ queryKey: ['screen', screenId] });
    },
    onError: (error: Error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Không thể lưu độ phân giải.',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-gray-500">Đang tải cài đặt màn hình...</p>
      </div>
    );
  }

  if (isError || !screen) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-red-600">Không thể tải cài đặt màn hình.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Cài đặt màn hình</h2>
          <p className="text-sm text-gray-500">{screen.name}</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasChanges || !!resolutionError}
          className="bg-agribank-green text-white px-4 py-2 rounded hover:bg-agribank-dark disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Đang lưu...' : 'Lưu Độ Phân Giải'}
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="player-url" className="block text-sm font-medium text-gray-700 mb-1">
          URL Player
        </label>
        <div className="flex gap-2">
          <input
            id="player-url"
            type="text"
            value={playerUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
            className="flex-1 border rounded px-3 py-2 text-sm bg-gray-50 font-mono"
          />
          <button
            type="button"
            onClick={handleCopyUrl}
            className="bg-agribank-green text-white px-4 py-2 rounded hover:bg-agribank-dark text-sm whitespace-nowrap"
          >
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Mở URL này trong Chrome trên máy LED để chạy playlist của màn hình.
        </p>
      </div>

      <div className="mt-4">
        <label htmlFor="screen-resolution" className="block text-sm font-medium text-gray-700 mb-1">
          Độ Phân Giải (WxH)
        </label>
        <input
          id="screen-resolution"
          type="text"
          value={resolutionInput}
          onChange={(event) => {
            setResolutionInput(event.target.value);
            setFeedback(null);
          }}
          placeholder="1920x1080"
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Để trống để sử dụng fallback viewport đầy đủ trên Player.
        </p>
        {resolutionError && (
          <p className="text-xs text-red-600 mt-1">{resolutionError}</p>
        )}
      </div>

      {feedback && (
        <p
          className={`text-sm mt-3 ${
            feedback.type === 'success' ? 'text-green-700' : 'text-red-600'
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
