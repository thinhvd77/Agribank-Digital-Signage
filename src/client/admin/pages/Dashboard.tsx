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
          <div className="w-10 h-10 rounded-full bg-agribank-gold/20 flex items-center justify-center border border-agribank-gold/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-display font-bold">Agribank Digital Signage</h1>
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
