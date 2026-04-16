import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  screenId: string;
  onPlaylistUpdate?: (playlist: unknown[]) => void;
}

export function useSocket({ screenId, onPlaylistUpdate }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io({
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
      socket.emit('register', { screenId });
    });

    socket.on('playlist_updated', (data: { screenId: string; playlist: unknown[] }) => {
      if (data.screenId === screenId) {
        console.log('[Socket] Playlist updated');
        onPlaylistUpdate?.(data.playlist);
      }
    });

    socket.on('ping', () => {
      socket.emit('status', {
        screenId,
        currentMediaId: null,
        progress: 0,
        isPlaying: true,
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    socketRef.current = socket;
  }, [screenId, onPlaylistUpdate]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  return socketRef.current;
}
