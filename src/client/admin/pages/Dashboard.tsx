import { useState } from 'react';
import ScreenList from '../components/ScreenList';
import PlaylistEditor from '../components/PlaylistEditor';
import MediaLibrary from '../components/MediaLibrary';

interface Props {
  token: string;
  onLogout: () => void;
}

export default function Dashboard({ token, onLogout }: Props) {
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);

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
              <PlaylistEditor token={token} screenId={selectedScreenId} />
              <div className="mt-6 flex-1 overflow-hidden">
                <MediaLibrary token={token} screenId={selectedScreenId} />
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
