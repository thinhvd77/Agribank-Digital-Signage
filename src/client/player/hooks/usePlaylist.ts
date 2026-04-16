import { useState, useEffect, useCallback } from 'react';
import type { PlayerPlaylistItem } from '@shared/types';

interface UsePlaylistOptions {
  screenId: string;
}

export function usePlaylist({ screenId }: UsePlaylistOptions) {
  const [playlist, setPlaylist] = useState<PlayerPlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylist = useCallback(async () => {
    try {
      const res = await fetch(`/api/screens/${screenId}/playlist`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('invalid-screen');
          return;
        }
        throw new Error('Failed to fetch playlist');
      }
      const data = await res.json();
      setPlaylist(data);
      setError(null);
    } catch (err) {
      console.error('[Playlist] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [screenId]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  }, [playlist.length]);

  const updatePlaylist = useCallback((newPlaylist: PlayerPlaylistItem[]) => {
    setPlaylist(newPlaylist);
    setCurrentIndex(0);
  }, []);

  const currentItem = playlist[currentIndex] || null;

  return {
    playlist,
    currentItem,
    currentIndex,
    loading,
    error,
    goToNext,
    updatePlaylist,
    refetch: fetchPlaylist,
  };
}
