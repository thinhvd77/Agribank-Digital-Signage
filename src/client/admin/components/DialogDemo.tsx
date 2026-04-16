import { useDialog } from '@shared/hooks/useDialog';

export default function DialogDemo() {
  const { alert, confirm, success, error, warning, info, toast } = useDialog();

  const handleShowAlert = async () => {
    await alert({
      title: 'Thông báo hệ thống',
      message: 'Phiên bản mới đã được cập nhật. Một số tính năng có thể thay đổi.',
      confirmText: 'Đã hiểu',
      variant: 'info',
    });
  };

  const handleShowSuccessAlert = async () => {
    await alert({
      title: 'Thành công!',
      message: 'Dữ liệu của bạn đã được lưu vào hệ thống một cách an toàn.',
      confirmText: 'Tuyệt vời',
      variant: 'success',
    });
  };

  const handleShowWarningAlert = async () => {
    await alert({
      title: 'Cảnh báo',
      message: 'Màn hình chưa được cấu hình độ phân giải. Có thể hiển thị không chính xác.',
      confirmText: 'Tôi sẽ cấu hình sau',
      variant: 'warning',
    });
  };

  const handleShowErrorAlert = async () => {
    await alert({
      title: 'Kết nối thất bại',
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
      confirmText: 'Thử lại',
      variant: 'error',
    });
  };

  const handleConfirmDelete = async () => {
    const shouldDelete = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa màn hình này? Tất cả dữ liệu playlist sẽ bị mất.',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Giữ lại',
      variant: 'warning',
    });

    if (shouldDelete) {
      success('Đã xóa', 'Màn hình đã được xóa khỏi hệ thống');
    } else {
      info('Đã hủy', 'Màn hình vẫn được giữ nguyên');
    }
  };

  const handleConfirmLogout = async () => {
    const shouldLogout = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn muốn đăng xuất khỏi hệ thống Agribank Digital Signage?',
      confirmText: 'Đăng xuất',
      cancelText: 'Ở lại',
      variant: 'info',
    });

    if (shouldLogout) {
      success('Đã đăng xuất', 'Hẹn gặp lại bạn!');
    }
  };

  const handleShowSuccessToast = () => {
    success('Lưu thành công', 'Playlist đã được cập nhật');
  };

  const handleShowErrorToast = () => {
    error('Tải lên thất bại', 'Định dạng file không được hỗ trợ');
  };

  const handleShowWarningToast = () => {
    warning('Dung lượng cao', 'File có dung lượng lớn (>50MB)');
  };

  const handleShowInfoToast = () => {
    info('Đang đồng bộ', 'Dữ liệu đang được gửi đến các màn hình...');
  };

  const handleShowCustomToast = () => {
    toast({
      title: 'Đồng bộ hoàn tất',
      message: 'Tất cả 3 màn hình đã cập nhật nội dung mới thành công',
      variant: 'success',
      duration: 8000,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">
          Dialog System Demo
        </h1>
        <p className="text-gray-600">
          Hệ thống thông báo thay thế alert và confirm mặc định
        </p>
      </div>

      {/* Alert Section */}
      <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-display text-xl font-semibold text-gray-800 mb-4">
          Alert Dialogs
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleShowAlert}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium
                     hover:bg-blue-600 transition-all duration-200 hover:scale-[1.02]"
          >
            Info Alert
          </button>
          <button
            onClick={handleShowSuccessAlert}
            className="px-5 py-2.5 bg-green-500 text-white rounded-lg font-medium
                     hover:bg-green-600 transition-all duration-200 hover:scale-[1.02]"
          >
            Success Alert
          </button>
          <button
            onClick={handleShowWarningAlert}
            className="px-5 py-2.5 bg-amber-500 text-white rounded-lg font-medium
                     hover:bg-amber-600 transition-all duration-200 hover:scale-[1.02]"
          >
            Warning Alert
          </button>
          <button
            onClick={handleShowErrorAlert}
            className="px-5 py-2.5 bg-red-500 text-white rounded-lg font-medium
                     hover:bg-red-600 transition-all duration-200 hover:scale-[1.02]"
          >
            Error Alert
          </button>
        </div>
      </div>

      {/* Confirm Section */}
      <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-display text-xl font-semibold text-gray-800 mb-4">
          Confirm Dialogs
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleConfirmDelete}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium
                     hover:bg-amber-700 transition-all duration-200 hover:scale-[1.02]"
          >
            Xác nhận xóa
          </button>
          <button
            onClick={handleConfirmLogout}
            className="px-5 py-2.5 bg-gray-700 text-white rounded-lg font-medium
                     hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02]"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Toast Section */}
      <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-display text-xl font-semibold text-gray-800 mb-4">
          Toast Notifications
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleShowSuccessToast}
            className="px-5 py-2.5 border-2 border-green-500 text-green-600 rounded-lg font-medium
                     hover:bg-green-50 transition-all duration-200"
          >
            Success Toast
          </button>
          <button
            onClick={handleShowErrorToast}
            className="px-5 py-2.5 border-2 border-red-500 text-red-600 rounded-lg font-medium
                     hover:bg-red-50 transition-all duration-200"
          >
            Error Toast
          </button>
          <button
            onClick={handleShowWarningToast}
            className="px-5 py-2.5 border-2 border-amber-500 text-amber-600 rounded-lg font-medium
                     hover:bg-amber-50 transition-all duration-200"
          >
            Warning Toast
          </button>
          <button
            onClick={handleShowInfoToast}
            className="px-5 py-2.5 border-2 border-blue-500 text-blue-600 rounded-lg font-medium
                     hover:bg-blue-50 transition-all duration-200"
          >
            Info Toast
          </button>
          <button
            onClick={handleShowCustomToast}
            className="px-5 py-2.5 border-2 border-purple-500 text-purple-600 rounded-lg font-medium
                     hover:bg-purple-50 transition-all duration-200"
          >
            Custom Duration (8s)
          </button>
        </div>
      </div>

      {/* Usage Code Section */}
      <div className="p-6 bg-gray-900 rounded-xl">
        <h2 className="font-display text-xl font-semibold text-white mb-4">
          Cách sử dụng
        </h2>
        <pre className="text-sm text-gray-300 overflow-x-auto">
{`import { useDialog } from '@shared/hooks/useDialog';

function MyComponent() {
  const { alert, confirm, success, error } = useDialog();

  const handleDelete = async () => {
    const shouldDelete = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn?',
      variant: 'warning',
    });

    if (shouldDelete) {
      // Thực hiện xóa
      success('Đã xóa thành công');
    }
  };

  return <button onClick={handleDelete}>Xóa</button>;
}`}
        </pre>
      </div>
    </div>
  );
}
