// Ví dụ sử dụng hệ thống Dialog - Thêm vào bất kỳ component nào để sử dụng

import { useDialog } from '../hooks/useDialog';

// Ví dụ 1: Sử dụng Alert thay thế alert() mặc định
export function ExampleWithAlert() {
  const { alert } = useDialog();

  const handleShowInfo = async () => {
    await alert({
      title: 'Thông báo',
      message: 'Cập nhật thông tin thành công!',
      confirmText: 'Đã hiểu',
      variant: 'info',
    });
    // Tiếp tục xử lý sau khi đóng dialog
  };

  const handleShowError = async () => {
    await alert({
      title: 'Lỗi kết nối',
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
      confirmText: 'Thử lại',
      variant: 'error',
    });
  };

  const handleShowSuccess = async () => {
    await alert({
      title: 'Thành công',
      message: 'Dữ liệu đã được lưu vào hệ thống.',
      confirmText: 'Tuyệt vời',
      variant: 'success',
    });
  };

  return (
    <div className="space-y-2">
      <button onClick={handleShowInfo} className="btn-info">Info Alert</button>
      <button onClick={handleShowError} className="btn-error">Error Alert</button>
      <button onClick={handleShowSuccess} className="btn-success">Success Alert</button>
    </div>
  );
}

// Ví dụ 2: Sử dụng Confirm thay thế confirm() mặc định
export function ExampleWithConfirm() {
  const { confirm } = useDialog();

  const handleDelete = async (itemId: string) => {
    const shouldDelete = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      variant: 'warning',
    });

    if (shouldDelete) {
      // Thực hiện xóa
      console.log('Deleting item:', itemId);
    }
  };

  const handleLogout = async () => {
    const shouldLogout = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn muốn đăng xuất khỏi hệ thống?',
      confirmText: 'Đăng xuất',
      cancelText: 'Ở lại',
      variant: 'info',
    });

    if (shouldLogout) {
      // Thực hiện đăng xuất
      localStorage.removeItem('token');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-2">
      <button onClick={() => handleDelete('item-123')} className="btn-warning">Xóa mục</button>
      <button onClick={handleLogout} className="btn-primary">Đăng xuất</button>
    </div>
  );
}

// Ví dụ 3: Sử dụng Toast notifications
export function ExampleWithToast() {
  const { toast, success, error, warning, info } = useDialog();

  const handleSave = async () => {
    try {
      // Giả lập API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Hiển thị toast thành công
      success('Đã lưu thay đổi', 'Playlist đã được cập nhật thành công');
    } catch (err) {
      // Hiển thị toast lỗi
      error('Lưu thất bại', 'Không thể cập nhật playlist. Vui lòng thử lại.');
    }
  };

  const handleValidate = () => {
    // Kiểm tra và hiển thị cảnh báo
    warning('Dung lượng cao', 'Video có dung lượng lớn, có thể ảnh hưởng đến tốc độ tải.');
  };

  const handleCustomToast = () => {
    toast({
      title: 'Đồng bộ hoàn tất',
      message: 'Dữ liệu đã được đồng bộ với 3 màn hình',
      variant: 'success',
      duration: 8000, // 8 giây
    });
  };

  const handleSync = () => {
    info('Đang đồng bộ', 'Dữ liệu đang được gửi đến các màn hình...');
  };

  return (
    <div className="space-y-2">
      <button onClick={handleSave} className="btn-primary">Lưu & Hiển thị Toast</button>
      <button onClick={handleValidate} className="btn-warning">Kiểm tra & Cảnh báo</button>
      <button onClick={handleCustomToast} className="btn-secondary">Custom Toast (8s)</button>
      <button onClick={handleSync} className="btn-info">Thông báo đồng bộ</button>
    </div>
  );
}

// Ví dụ 4: Kết hợp Alert + Toast trong workflow
export function ExampleWorkflow() {
  const { confirm, alert, success } = useDialog();

  const handlePublishPlaylist = async () => {
    // Bước 1: Xác nhận trước khi publish
    const shouldPublish = await confirm({
      title: 'Xuất bản playlist',
      message: 'Playlist sẽ được gửi đến tất cả màn hình. Bạn có chắc chắn?',
      confirmText: 'Xuất bản',
      cancelText: 'Hủy',
      variant: 'warning',
    });

    if (!shouldPublish) return;

    try {
      // Bước 2: Giả lập publish
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Bước 3: Thông báo thành công
      await alert({
        title: 'Xuất bản thành công',
        message: 'Playlist đã được gửi đến 3 màn hình. Bạn có thể kiểm tra trạng thái trong Dashboard.',
        confirmText: 'Đã hiểu',
        variant: 'success',
      });

      // Bước 4: Hiển thị toast thông báo nhẹ nhàng
      success('Đồng bộ hoàn tất', 'Tất cả màn hình đã cập nhật');
    } catch (err) {
      await alert({
        title: 'Xuất bản thất bại',
        message: 'Có lỗi xảy ra khi gửi playlist. Vui lòng thử lại sau.',
        confirmText: 'Đóng',
        variant: 'error',
      });
    }
  };

  return (
    <button onClick={handlePublishPlaylist} className="btn-primary btn-lg">
      Xuất bản Playlist
    </button>
  );
}

// Export all examples
export const DialogExamples = {
  Alert: ExampleWithAlert,
  Confirm: ExampleWithConfirm,
  Toast: ExampleWithToast,
  Workflow: ExampleWorkflow,
};
