import { useEffect, useState } from 'react';
import ScreenList from '../components/ScreenList';
import ScreenSettings from '../components/ScreenSettings';
import ProfileTabs from '../components/ProfileTabs';
import PlaylistEditor from '../components/PlaylistEditor';
import MediaLibrary from '../components/MediaLibrary';

interface Props {
  token: string;
  onLogout: () => void;
}

export default function Dashboard({ token, onLogout }: Props) {
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedProfileId(null);
  }, [selectedScreenId]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-agribank-green text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Agribank Digital Signage</h1>
        <button
          onClick={onLogout}
          className="text-sm hover:underline"
        >
          Logout
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-50 border-r overflow-y-auto">
          <ScreenList
            token={token}
            selectedId={selectedScreenId}
            onSelect={setSelectedScreenId}
          />
        </aside>

        {/* Content area */}
        <main className="flex-1 flex flex-col overflow-hidden p-6">
          {selectedScreenId ? (
            <>
              <div className="mb-6">
                <ScreenSettings token={token} screenId={selectedScreenId} />
              </div>

              <div className="mb-6">
                <ProfileTabs
                  token={token}
                  screenId={selectedScreenId}
                  selectedProfileId={selectedProfileId}
                  onSelectProfile={setSelectedProfileId}
                />
              </div>

              {selectedProfileId ? (
                <PlaylistEditor token={token} profileId={selectedProfileId} />
              ) : (
                <div className="bg-white rounded-lg border p-4 text-gray-500">
                  Select a profile to manage its playlist.
                </div>
              )}

              <div className="mt-6 flex-1 overflow-hidden">
                <MediaLibrary
                  token={token}
                  onAddToPlaylist={(media) => {
                    if (!selectedProfileId) {
                      alert('Please select a profile before adding media to playlist.');
                      return;
                    }
                    (window as any).__addToPlaylist?.(media);
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a screen to manage its playlist
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
