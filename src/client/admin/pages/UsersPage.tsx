import { useEffect, useState } from 'react';
import UserCrudModal from '../components/UserCrudModal';
import { useDialog } from '@shared/hooks/useDialog';
import type { ManagedUser, Screen, User } from '@shared/types';

interface Props {
  token: string;
  user: User;
  onNavigate: (page: 'dashboard' | 'users') => void;
  onLogout: () => void;
}

type ModalState =
  | { kind: 'create' }
  | { kind: 'reset'; userId: string; username: string }
  | null;

export default function UsersPage({ token, onNavigate, onLogout }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const { confirm, alert } = useDialog();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/screens', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!uRes.ok) throw new Error('Không tải được danh sách tài khoản');
      if (!sRes.ok) throw new Error('Không tải được danh sách màn hình');
      setUsers(await uRes.json());
      setScreens(await sRes.json());
    } catch (err) {
      await alert({
        title: 'Lỗi',
        message: err instanceof Error ? err.message : 'Có lỗi xảy ra',
        confirmText: 'Đã hiểu',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screenName = (id: string | null) =>
    screens.find((s) => s.id === id)?.name ?? '—';

  const availableScreens = screens.filter(
    (s) => !users.some((u) => u.screenId === s.id)
  );

  const handleDelete = async (u: ManagedUser) => {
    const confirmed = await confirm({
      title: 'Xoá tài khoản',
      message: `Xoá tài khoản "${u.username}"? Thao tác không thể hoàn tác.`,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      variant: 'warning',
    });
    if (!confirmed) return;

    const res = await fetch(`/api/users/${u.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      await alert({
        title: 'Xoá thất bại',
        message: data.message || 'Không thể xoá tài khoản',
        confirmText: 'Đã hiểu',
        variant: 'error',
      });
      return;
    }
    await fetchAll();
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
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 text-md font-medium rounded-lg hover:bg-white/10"
          >
            Dashboard
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-md font-medium rounded-lg hover:bg-white/10"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Tài khoản quản lý màn hình</h1>
            <button
              onClick={() => setModal({ kind: 'create' })}
              disabled={availableScreens.length === 0}
              className="px-4 py-2 bg-agribank-green text-white rounded-md hover:bg-agribank-dark disabled:opacity-50"
              title={availableScreens.length === 0 ? 'Mọi màn hình đã có người quản lý' : ''}
            >
              + Tạo tài khoản
            </button>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-8">Đang tải...</div>
          ) : users.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-white rounded border">
              Chưa có tài khoản quản lý nào. Nhấn "Tạo tài khoản" để thêm.
            </div>
          ) : (
            <table className="w-full bg-white rounded border">
              <thead className="bg-gray-50 text-left text-sm">
                <tr>
                  <th className="p-3">Tên đăng nhập</th>
                  <th className="p-3">Màn hình</th>
                  <th className="p-3">Ngày tạo</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t text-sm">
                    <td className="p-3 font-medium">{u.username}</td>
                    <td className="p-3">{screenName(u.screenId)}</td>
                    <td className="p-3 text-gray-600">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setModal({ kind: 'reset', userId: u.id, username: u.username })}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Đặt lại mật khẩu
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                      >
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {modal && (
        <UserCrudModal
          token={token}
          mode={
            modal.kind === 'create'
              ? { kind: 'create', screens: availableScreens }
              : { kind: 'reset', userId: modal.userId, username: modal.username }
          }
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
