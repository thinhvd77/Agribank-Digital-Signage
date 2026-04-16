# Hệ thống Dialog Components

## Tổng quan

Hệ thống thông báo thay thế `alert()` và `confirm()` mặc định của browser với giao diện chuyên nghiệp, phù hợp với thương hiệu Agribank.

## Cài đặt

Dialog Provider đã được thêm vào `main.tsx`:

```tsx
import { DialogProvider } from '@shared/components/dialog';

<DialogProvider>
  <App />
</DialogProvider>
```

## Sử dụng

### Hook `useDialog`

```typescript
import { useDialog } from '@shared/hooks/useDialog';

function MyComponent() {
  const { alert, confirm, success, error, warning, info, toast } = useDialog();
  
  // ...
}
```

### Alert Dialog (thay thế `alert()`)

```typescript
await alert({
  title: 'Thông báo',
  message: 'Nội dung thông báo...',
  confirmText: 'Đồng ý', // optional
  variant: 'info', // 'info' | 'success' | 'warning' | 'error'
});

// Hoặc các variant khác
await alert({ title: 'Lỗi', message: '...', variant: 'error' });
await alert({ title: 'Thành công', message: '...', variant: 'success' });
await alert({ title: 'Cảnh báo', message: '...', variant: 'warning' });
```

### Confirm Dialog (thay thế `confirm()`)

```typescript
const shouldDelete = await confirm({
  title: 'Xác nhận xóa',
  message: 'Bạn có chắc chắn muốn xóa?',
  confirmText: 'Xóa',
  cancelText: 'Hủy',
  variant: 'warning',
});

if (shouldDelete) {
  // Thực hiện xóa
}
```

### Toast Notifications

```typescript
// Shorthand methods
success('Thành công', 'Dữ liệu đã được lưu');
error('Lỗi', 'Không thể kết nối máy chủ');
warning('Cảnh báo', 'File có dung lượng lớn');
info('Thông báo', 'Đang xử lý...');

// Custom toast với duration
toast({
  title: 'Hoàn tất',
  message: 'Đã đồng bộ với 3 màn hình',
  variant: 'success',
  duration: 8000, // milliseconds (default: 5000)
});
```

## Ví dụ thực tế

### Xử lý xóa với xác nhận

```typescript
const handleDelete = async (itemId: string) => {
  const shouldDelete = await confirm({
    title: 'Xác nhận xóa',
    message: 'Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.',
    confirmText: 'Xóa vĩnh viễn',
    cancelText: 'Giữ lại',
    variant: 'error',
  });

  if (shouldDelete) {
    await deleteItem(itemId);
    success('Đã xóa', 'Mục đã được xóa thành công');
  }
};
```

### Workflow với nhiều bước

```typescript
const handlePublish = async () => {
  const shouldPublish = await confirm({
    title: 'Xuất bản',
    message: 'Gửi playlist đến tất cả màn hình?',
    variant: 'warning',
  });

  if (!shouldPublish) return;

  try {
    await publishPlaylist();
    await alert({
      title: 'Thành công',
      message: 'Playlist đã được xuất bản',
      variant: 'success',
    });
    success('Đồng bộ hoàn tất');
  } catch (err) {
    error('Xuất bản thất bại', 'Vui lòng thử lại sau');
  }
};
```

## Demo

Xem file `src/client/admin/components/DialogDemo.tsx` để tham khảo các ví dụ đầy đủ.

## Design

- **Font**: Playfair Display (headings) + Source Sans 3 (body)
- **Màu sắc**: 
  - Xanh Agribank (#00723F)
  - Vàng đồng (#D4AF37) 
  - Đỏ cảnh báo (#A62C2C)
- **Animation**: Spring physics, backdrop blur, staggered reveals
- **Accessibility**: ESC để đóng, click backdrop để hủy
