import { useState, useEffect } from 'react';
import type { Screen } from '@shared/types';

type Mode =
  | { kind: 'create'; screens: Screen[] }
  | { kind: 'reset'; userId: string; username: string };

interface Props {
  token: string;
  mode: Mode;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserCrudModal({ token, mode, onClose, onSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [screenId, setScreenId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUsername('');
    setPassword('');
    setScreenId(mode.kind === 'create' && mode.screens[0] ? mode.screens[0].id : '');
    setError('');
  }, [mode]);

  const title = mode.kind === 'create' ? 'Tạo tài khoản quản lý màn hình' : `Đặt lại mật khẩu: ${mode.username}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode.kind === 'create') {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ username, password, screenId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Tạo tài khoản thất bại');
        }
      } else {
        const res = await fetch(`/api/users/${mode.userId}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Đặt lại mật khẩu thất bại');
        }
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
          )}

          {mode.kind === 'create' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-agribank-green"
                  required
                  minLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Màn hình phụ trách</label>
                <select
                  value={screenId}
                  onChange={(e) => setScreenId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  {mode.screens.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-agribank-green"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">Tối thiểu 8 ký tự</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              disabled={loading}
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-agribank-green text-white rounded-md hover:bg-agribank-dark disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : mode.kind === 'create' ? 'Tạo' : 'Đặt lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
