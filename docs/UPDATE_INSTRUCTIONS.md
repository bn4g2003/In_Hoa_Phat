# Hướng dẫn Cập nhật Database

## Chạy SQL Update

Để sử dụng đầy đủ các tính năng động, bạn cần chạy file SQL update trong Supabase:

1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Copy nội dung từ file `docs/schema_update.sql`
4. Chạy script

## Các thay đổi chính

### 1. Bảng `departments` - Thêm cột mới
- `permissions TEXT[]` - Mảng quyền hạn của bộ phận
- `is_entry_point BOOLEAN` - Đánh dấu bộ phận có thể nhận việc đầu tiên

### 2. Bảng `workflow_templates` - Mới
Lưu trữ các quy trình mẫu có thể cấu hình:
- `name` - Tên quy trình
- `description` - Mô tả
- `department_sequence INTEGER[]` - Chuỗi ID bộ phận theo thứ tự
- `is_active BOOLEAN` - Trạng thái hoạt động

### 3. Bảng `machines` - Mới
Lưu trữ danh sách máy móc theo bộ phận:
- `code` - Mã máy
- `name` - Tên máy
- `type` - Loại (Digital, Offset, Processing)
- `department_id` - ID bộ phận sở hữu
- `status` - Trạng thái (active, maintenance, inactive)

## Dữ liệu mẫu

Script sẽ tự động tạo:
- 9 quy trình mẫu phổ biến
- 12 máy móc mẫu cho các bộ phận

## Sau khi chạy SQL

1. Xóa cache của ứng dụng bằng cách đăng xuất và đăng nhập lại
2. Kiểm tra trang Cấu hình > Quy trình mẫu
3. Kiểm tra trang Cấu hình > Máy móc

## Quản lý động

### Thêm quy trình mới
1. Vào Cấu hình > Quy trình mẫu
2. Nhấn "Thêm Quy trình"
3. Nhập tên, mô tả và chọn chuỗi bộ phận

### Thêm máy mới
1. Vào Cấu hình > Máy móc
2. Nhấn "Thêm Máy"
3. Nhập thông tin và chọn bộ phận

### Cấu hình bộ phận
1. Vào Tổ chức > Bộ phận
2. Chỉnh sửa bộ phận
3. Đánh dấu "Là điểm đầu vào" nếu bộ phận có thể nhận việc đầu
4. Chọn quyền hạn cho bộ phận
