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
      <header className="bg-agribank-green text-white px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-60 h-10 flex items-center justify-center">
            <img src="/full-logo.png" alt="Agribank Logo" />
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-md font-medium rounded-lg transition-all duration-200
                   hover:bg-white/10 active:scale-[0.98]"
        >
          Đăng xuất
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-50 border-r overflow-y-auto">
          <ScreenList
            token={token}
            selectedId={selectedScreenId}
            onSelect={setSelectedScreenId}
          />
        </aside>

        {/* Content area */}
        <main className="flex-1 flex overflow-y-auto flex-col p-6 gap-4 min-h-0">
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
              <div className="flex gap-4 items-start">
                {/* Playlist editor — narrow fixed column */}
                <div className="w-100 flex-shrink-0">
                  {selectedProfileId ? (
                    <PlaylistEditor token={token} profileId={selectedProfileId} />
                  ) : (
                    <div className="bg-white rounded-lg border p-4 text-gray-500 flex items-center justify-center text-center text-sm">
                      Chọn một profile để quản lý danh sách phát.
                    </div>
                  )}
                </div>

                {/* Media library — fills remaining space */}
                <div className="flex-1 min-w-0">
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
            <div className="text-mlg flex-1 flex items-center justify-center">
              Chọn một màn hình để xem và quản lý nội dung hiển thị.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
