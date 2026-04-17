import { useEffect, useState } from 'react';
import ScreenList from '../components/ScreenList';
import ScreenSettings from '../components/ScreenSettings';
import ProfileTabs from '../components/ProfileTabs';
import PlaylistEditor from '../components/PlaylistEditor';
import MediaLibrary from '../components/MediaLibrary';
import { useDialog } from '@shared/hooks/useDialog';

interface Props {
  token: string;
  onLogout: () => void;
}

export default function Dashboard({ token, onLogout }: Props) {
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const { confirm, alert } = useDialog();

  useEffect(() => {
    setSelectedProfileId(null);
  }, [selectedScreenId]);

  const handleLogout = async () => {
    const shouldLogout = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
      confirmText: 'Đăng xuất',
      cancelText: 'Ở lại',
      variant: 'info',
    });
    if (shouldLogout) {
      onLogout();
    }
  };

  return (
    <div className="h-screen flex flex-col font-body">
      {/* Header */}
      <header className="bg-agribank-green text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/logo.png" alt="Agribank Logo" />
          </div>
          <h1 className="text-lg font-display font-bold">AGRIBANK</h1>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                   hover:bg-white/10 active:scale-[0.98]"
        >
          Đăng xuất
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
        <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
          {selectedScreenId ? (
            <>
              {/* Top section: screen settings + profile tabs */}
              <div className="flex-shrink-0 flex flex-col gap-4">
                <ScreenSettings token={token} screenId={selectedScreenId} />
                <ProfileTabs
                  token={token}
                  screenId={selectedScreenId}
                  selectedProfileId={selectedProfileId}
                  onSelectProfile={setSelectedProfileId}
                />
              </div>

              {/* Bottom section: playlist (left) + media library (right) */}
              <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                {/* Playlist editor — narrow fixed column */}
                <div className="w-80 flex-shrink-0 overflow-y-auto">
                  {selectedProfileId ? (
                    <PlaylistEditor token={token} profileId={selectedProfileId} />
                  ) : (
                    <div className="bg-white rounded-lg border p-4 text-gray-500 h-full flex items-center justify-center text-center text-sm">
                      Chọn một profile để quản lý playlist.
                    </div>
                  )}
                </div>

                {/* Media library — fills remaining space */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <MediaLibrary
                    token={token}
                    selectedProfileId={selectedProfileId}
                    onAddToPlaylist={(media) => {
                      (window as any).__addToPlaylist?.(media);
                    }}
                    onSelectProfile={async () => {
                      await alert({
                        title: 'Chưa chọn profile',
                        message: 'Vui lòng chọn một profile trước khi thêm media vào playlist.',
                        confirmText: 'Đã hiểu',
                        variant: 'warning',
                      });
                    }}
                  />
                </div>
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
