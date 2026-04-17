import { useEffect, useMemo, useState } from 'react';
import { isValidResolutionString } from '@shared/utils/resolution';
import type { Screen } from '@shared/types';

export interface ScreenFormPayload {
  name: string;
  location: string | null;
  resolution: string | null;
}

interface Props {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialScreen?: Screen | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ScreenFormPayload) => void;
}

export default function ScreenCrudModal({
  isOpen,
  mode,
  initialScreen,
  isSubmitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [resolution, setResolution] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setName(initialScreen?.name ?? '');
    setLocation(initialScreen?.location ?? '');
    setResolution(initialScreen?.resolution ?? '');
    setNameError(null);
  }, [isOpen, initialScreen]);

  const normalizedResolution = resolution.trim().toLowerCase();

  const resolutionError = useMemo(() => {
    if (!normalizedResolution) return null;
    if (isValidResolutionString(normalizedResolution)) return null;
    return 'Độ phân giải phải theo định dạng WxH, ví dụ: 1920x1080.';
  }, [normalizedResolution]);

  if (!isOpen) {
    return null;
  }

  const title = mode === 'create' ? 'Thêm Màn Hình' : 'Chỉnh Sửa Màn Hình';
  const submitText = mode === 'create' ? 'Tạo Màn Hình' : 'Lưu Thay Đổi';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedName = name.trim();
    if (!normalizedName) {
      setNameError('Tên là bắt buộc.');
      return;
    }

    if (resolutionError) {
      return;
    }

    onSubmit({
      name: normalizedName,
      location: location.trim() || null,
      resolution: normalizedResolution || null,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <label htmlFor="screen-name" className="block text-sm font-medium text-gray-700 mb-1">
                Tên <span className="text-red-600">*</span>
              </label>
              <input
                id="screen-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(null);
                }}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Chi nhanh Ha Noi"
                autoFocus
              />
              {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            </div>

            <div>
              <label htmlFor="screen-location" className="block text-sm font-medium text-gray-700 mb-1">
                Vị Trí
              </label>
              <input
                id="screen-location"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Tang 1, sanh chinh"
              />
            </div>

            <div>
              <label htmlFor="screen-resolution-modal" className="block text-sm font-medium text-gray-700 mb-1">
                Độ Phân Giải (WxH)
              </label>
              <input
                id="screen-resolution-modal"
                type="text"
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="1920x1080"
              />
              <p className="text-xs text-gray-500 mt-1">
                Để trống để Player sử dụng kích thước màn hình hiện tại.
              </p>
              {resolutionError && <p className="text-xs text-red-600 mt-1">{resolutionError}</p>}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!resolutionError}
              className="bg-agribank-green text-white px-4 py-2 rounded text-sm hover:bg-agribank-dark disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
