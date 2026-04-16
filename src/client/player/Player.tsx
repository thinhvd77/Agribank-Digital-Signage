import { useEffect, useRef, useState } from 'react';
import { usePlaylist } from './hooks/usePlaylist';
import { useSocket } from '@shared/hooks/useSocket';
import type { PlayerPlaylistItem, ScreenConfig } from '@shared/types';
import { parseResolution, type ParsedResolution } from '@shared/utils/resolution';

interface Props {
  screenId: string;
}

export default function Player({ screenId }: Props) {
  const { playlist, currentItem, loading, error, goToNext, updatePlaylist } = usePlaylist({ screenId });
  const [fade, setFade] = useState(false);
  const [screenResolution, setScreenResolution] = useState<ParsedResolution | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchScreenConfig = async () => {
      try {
        const res = await fetch(`/api/screens/${screenId}/config`);
        if (!res.ok) {
          return;
        }

        const config = await res.json() as ScreenConfig;
        if (!isMounted) {
          return;
        }

        setScreenResolution(parseResolution(config.resolution));
      } catch (err) {
        console.error('[Player] Screen config fetch error:', err);
      }
    };

    setScreenResolution(null);
    fetchScreenConfig();

    return () => {
      isMounted = false;
    };
  }, [screenId]);

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

  // Handle duration timer for both images and videos.
  // For videos, this races with onEnded — whichever fires first triggers goToNext,
  // and the effect cleanup (or video unmount) cancels the loser.
  useEffect(() => {
    if (!currentItem) return;

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

  const frameStyle: React.CSSProperties = screenResolution
    ? {
      position: 'relative',
      width: `min(100vw, calc(100vh * ${screenResolution.aspectRatio}))`,
      height: `min(100vh, calc(100vw / ${screenResolution.aspectRatio}))`,
      backgroundColor: '#000',
      overflow: 'hidden',
    }
    : {
      position: 'relative',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      overflow: 'hidden',
    };

  const mediaStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#000',
    transition: 'opacity 300ms',
    opacity: fade ? 0 : 1,
  };

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div style={frameStyle}>
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
            style={mediaStyle}
          />
        ) : currentItem?.type === 'image' ? (
          <img
            key={currentItem.mediaId}
            src={currentItem.url}
            alt=""
            style={mediaStyle}
            onError={() => {
              console.error('[Player] Image error, skipping');
              goToNext();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
