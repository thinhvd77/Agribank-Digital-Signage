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
    return 'Resolution must follow WxH format, e.g. 1920x1080.';
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
        message: 'Resolution saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      queryClient.invalidateQueries({ queryKey: ['screen', screenId] });
    },
    onError: (error: Error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to save resolution.',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-gray-500">Loading screen settings...</p>
      </div>
    );
  }

  if (isError || !screen) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-red-600">Unable to load screen settings.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Screen Settings</h2>
          <p className="text-sm text-gray-500">{screen.name}</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasChanges || !!resolutionError}
          className="bg-agribank-green text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Resolution'}
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="screen-resolution" className="block text-sm font-medium text-gray-700 mb-1">
          Resolution (WxH)
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
          Leave blank to use full viewport fallback on the Player.
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
