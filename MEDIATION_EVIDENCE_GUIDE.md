# Hướng dẫn sử dụng hệ thống nộp bằng chứng hòa giải

## Tình huống hiện tại
Bạn đang ở tài khoản **Freelancer** và dispute đã chuyển sang trạng thái **"admin hòa giải"** (INTERNAL_MEDIATION).

## Tính năng mới đã được tích hợp

### 1. Tab "Hồ sơ & chứng cứ" được cập nhật
- **Trước đây**: Sử dụng hệ thống arbitration evidence (có thể bị lỗi)
- **Bây giờ**: Tự động chuyển sang hệ thống mediation evidence khi dispute ở trạng thái INTERNAL_MEDIATION

### 2. Giao diện mới cho Freelancer/Client
Khi vào tab "Hồ sơ & chứng cứ", bạn sẽ thấy:

#### Tab "Bằng chứng"
- **Nộp bằng chứng**: Nút "Nộp bằng chứng" để upload tài liệu
- **Trạng thái**: Hiển thị đã nộp hay chưa nộp bằng chứng
- **Danh sách**: Xem tất cả bằng chứng đã nộp từ cả hai bên

#### Tab "Đề xuất hòa giải"  
- **Xem đề xuất**: Admin sẽ tạo đề xuất sau khi xem xét bằng chứng
- **Phản hồi**: Chấp nhận hoặc từ chối đề xuất của admin
- **Tự động xử lý**: Nếu cả hai bên chấp nhận, hệ thống tự động xử lý thanh toán

### 3. Quy trình hoạt động

1. **Freelancer/Client nộp bằng chứng**
   - Click "Nộp bằng chứng" 
   - Upload tài liệu, hình ảnh
   - Thêm mô tả và ghi chú

2. **Admin xem xét và tạo đề xuất**
   - Admin join vào chat dispute
   - Xem xét bằng chứng từ cả hai bên
   - Tạo đề xuất phân chia escrow

3. **Cả hai bên phản hồi**
   - Xem đề xuất trong tab "Đề xuất hòa giải"
   - Chấp nhận hoặc từ chối với lý do
   - Nếu cả hai chấp nhận → Tự động xử lý thanh toán

## Lưu ý quan trọng

### Cần chạy Database Migration
Hệ thống mới cần database migration để hoạt động:
```bash
cd lvtn_be
npx prisma migrate dev --name add-mediation-evidence
npx prisma generate
```

### Nếu chưa chạy migration
- Tab sẽ hiển thị thông báo "Hệ thống hòa giải chưa sẵn sàng"
- Cần admin chạy migration trước khi sử dụng

### API Endpoints mới
- `/mediation-evidence/*` - Quản lý bằng chứng
- `/mediation-proposal/*` - Quản lý đề xuất hòa giải

## Kiểm tra hoạt động

1. **Vào trang dispute** → Tab "Hồ sơ & chứng cứ"
2. **Kiểm tra giao diện mới** với 2 tab: "Bằng chứng" và "Đề xuất hòa giải"
3. **Thử nộp bằng chứng** (nếu đã chạy migration)
4. **Chờ admin tạo đề xuất** và phản hồi

Hệ thống đã được tích hợp hoàn chỉnh và sẵn sàng sử dụng sau khi chạy migration!