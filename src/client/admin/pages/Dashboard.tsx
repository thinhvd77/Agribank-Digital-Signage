import { useEffect, useState } from 'react';
import ScreenList from '../components/ScreenList';
import ScreenSettings from '../components/ScreenSettings';
import ProfileTabs from '../components/ProfileTabs';
import PlaylistEditor from '../components/PlaylistEditor';
import MediaLibrary from '../components/MediaLibrary';
import { useDialog } from '@shared/hooks/useDialog';
import type { User } from '@shared/types';

interface Props {
  token: string;
  user: User;
  onNavigate: (page: 'dashboard' | 'users') => void;
  onLogout: () => void;
}

export default function Dashboard({ token, user, onNavigate, onLogout }: Props) {
  const isManager = user.role === 'screen_manager';
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(
    isManager ? user.screenId : null
  );
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
      <header className="bg-agribank-green text-white px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-60 h-10 flex items-center justify-center">
            <img src="/full-logo.png" alt="Agribank Logo" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'admin' && (
            <button
              onClick={() => onNavigate('users')}
              className="px-4 py-2 text-md font-medium rounded-lg transition-all duration-200
                       hover:bg-white/10 active:scale-[0.98]"
            >
              Tài khoản
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-md font-medium rounded-lg transition-all duration-200
                     hover:bg-white/10 active:scale-[0.98]"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {!isManager && (
          <aside className="w-64 bg-gray-50 border-r overflow-y-auto">
            <ScreenList
              token={token}
              selectedId={selectedScreenId}
              onSelect={setSelectedScreenId}
            />
          </aside>
        )}

        <main className="flex-1 flex overflow-y-auto flex-col p-6 gap-4 min-h-0">
          {selectedScreenId ? (
            <>
              <div className="flex-shrink-0 flex flex-col gap-4">
                <ScreenSettings token={token} screenId={selectedScreenId} />
                <ProfileTabs
                  token={token}
                  screenId={selectedScreenId}
                  selectedProfileId={selectedProfileId}
                  onSelectProfile={setSelectedProfileId}
                />
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-90 flex-shrink-0">
                  {selectedProfileId ? (
                    <PlaylistEditor token={token} profileId={selectedProfileId} />
                  ) : (
                    <div className="bg-white rounded-lg border p-4 text-gray-500 flex items-center justify-center text-center text-sm">
                      Chọn một profile để quản lý danh sách phát.
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <MediaLibrary
                    token={token}
                    userRole={user.role}
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
