import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@shared/hooks/useApi';
import { useDialog } from '@shared/hooks/useDialog';
import type { Screen } from '@shared/types';
import ScreenCrudModal, { type ScreenFormPayload } from './ScreenCrudModal';

interface Props {
  token: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function ScreenList({ token, selectedId, onSelect }: Props) {
  const { fetchApi } = useApi(token);
  const queryClient = useQueryClient();
  const { confirm, success, error } = useDialog();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);

  const { data: screens = [], isLoading } = useQuery({
    queryKey: ['screens'],
    queryFn: () => fetchApi<Screen[]>('/api/screens'),
  });

  const closeModal = () => {
    setModalMode(null);
    setEditingScreen(null);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: ScreenFormPayload) => {
      return fetchApi<Screen>('/api/screens', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      success('Tạo màn hình thành công', `Đã tạo màn hình "${created.name}"`);
      onSelect(created.id);
      closeModal();
    },
    onError: (err: Error) => {
      error('Tạo màn hình thất bại', err.message || 'Không thể tạo màn hình mới');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ screenId, payload }: { screenId: string; payload: ScreenFormPayload }) => {
      return fetchApi<Screen>(`/api/screens/${screenId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      queryClient.invalidateQueries({ queryKey: ['screen', updated.id] });
      success('Cập nhật thành công', `Đã cập nhật màn hình "${updated.name}"`);
      closeModal();
    },
    onError: (err: Error) => {
      error('Cập nhật thất bại', err.message || 'Không thể cập nhật màn hình');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (screenId: string) => {
      await fetchApi(`/api/screens/${screenId}`, {
        method: 'DELETE',
      });
      return screenId;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      queryClient.invalidateQueries({ queryKey: ['screen', deletedId] });
      success('Đã xóa màn hình', 'Màn hình đã được đưa vào trạng thái xóa mềm');

      if (selectedId === deletedId) {
        const fallback = screens.find((screen) => screen.id !== deletedId);
        onSelect(fallback?.id ?? null);
      }
    },
    onError: (err: Error) => {
      error('Xóa màn hình thất bại', err.message || 'Không thể xóa màn hình');
    },
  });

  const handleModalSubmit = (payload: ScreenFormPayload) => {
    if (modalMode === 'create') {
      createMutation.mutate(payload);
      return;
    }

    if (modalMode === 'edit' && editingScreen) {
      updateMutation.mutate({ screenId: editingScreen.id, payload });
    }
  };

  const handleDeleteScreen = async (screen: Screen) => {
    const shouldDelete = await confirm({
      title: 'Xóa màn hình',
      message: `Bạn có chắc chắn muốn xóa màn hình "${screen.name}"? Dữ liệu sẽ được xóa mềm và không hiển thị ở dashboard.`,
      confirmText: 'Xóa màn hình',
      cancelText: 'Hủy',
      variant: 'error',
    });

    if (!shouldDelete) {
      return;
    }

    deleteMutation.mutate(screen.id);
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">
            Screens
          </h2>
          <button
            onClick={() => {
              setEditingScreen(null);
              setModalMode('create');
            }}
            className="text-sm px-2.5 py-1.5 rounded bg-agribank-green text-white hover:bg-agribank-dark"
          >
            + Thêm màn hình
          </button>
        </div>

        {screens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500">
            Không tìm thấy màn hình nào. Click <span className="font-semibold">Thêm màn hình</span> để tạo một màn hình mới.
          </div>
        ) : (
          <div className="space-y-2">
            {screens.map((screen) => (
              <div
                key={screen.id}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedId === screen.id
                    ? 'border-agribank-green bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <button
                  onClick={() => onSelect(screen.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{screen.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        screen.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <div className="mt-1 space-y-1">
                    {screen.location && (
                      <p className="text-sm text-gray-500">{screen.location}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Độ phân giải: {screen.resolution || 'Not set'}
                    </p>
                  </div>
                </button>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setEditingScreen(screen);
                      setModalMode('edit');
                    }}
                    disabled={isMutating}
                    className="px-2.5 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={() => handleDeleteScreen(screen)}
                    disabled={isMutating}
                    className="px-2.5 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScreenCrudModal
        isOpen={modalMode !== null}
        mode={modalMode ?? 'create'}
        initialScreen={editingScreen}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
