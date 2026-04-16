import { useEffect, useRef, useState } from 'react';
import { usePlaylist } from './hooks/usePlaylist';
import { useSocket } from '@shared/hooks/useSocket';
import type { PlayerPlaylistItem } from '@shared/types';

interface Props {
  screenId: string;
}

export default function Player({ screenId }: Props) {
  const { playlist, currentItem, loading, error, goToNext, updatePlaylist } = usePlaylist({ screenId });
  const [fade, setFade] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  useSocket({
    screenId,
    onPlaylistUpdate: (data) => {
      setFade(true);
      setTimeout(() => {
        updatePlaylist(data as PlayerPlaylistItem[]);
        setFade(false);
      }, 300);
    },
  });

  // Handle image duration timer
  useEffect(() => {
    if (!currentItem || currentItem.type === 'video') return;

    timerRef.current = window.setTimeout(() => {
      goToNext();
    }, currentItem.duration * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItem, goToNext]);

  // Handle video end
  const handleVideoEnd = () => {
    goToNext();
  };

  // Handle video error - skip to next
  const handleVideoError = () => {
    console.error('[Player] Video error, skipping');
    goToNext();
  };

  // Empty playlist refresh
  useEffect(() => {
    if (playlist.length === 0 && !loading) {
      const interval = setInterval(() => {
        window.location.reload();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [playlist.length, loading]);

  if (error === 'invalid-screen') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
        <p className="text-xl">Man hinh khong ton tai</p>
        <p className="text-sm mt-2 text-gray-400">Vui long kiem tra cau hinh URL</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (playlist.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
        <img src="/agribank-logo.svg" alt="Agribank" className="w-48 h-48 mb-4" />
        <p className="text-gray-400">Chua co noi dung</p>
        <p className="text-sm text-gray-500 mt-1">Vui long cap nhat playlist</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full bg-black transition-opacity duration-300 ${
        fade ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {currentItem?.type === 'video' ? (
        <video
          ref={videoRef}
          key={currentItem.mediaId}
          src={currentItem.url}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          onError={handleVideoError}
          className="w-full h-full object-contain"
        />
      ) : currentItem?.type === 'image' ? (
        <img
          key={currentItem.mediaId}
          src={currentItem.url}
          alt=""
          className="w-full h-full object-contain"
          onError={() => {
            console.error('[Player] Image error, skipping');
            goToNext();
          }}
        />
      ) : null}
    </div>
  );
}
