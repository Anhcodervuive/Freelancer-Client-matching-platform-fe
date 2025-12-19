# Tính năng xuất tài liệu tranh chấp cho Freelancer và Client

## Tổng quan
Đã thêm tính năng cho phép Freelancer và Client xuất tài liệu tranh chấp khi đã có ít nhất 2 lần admin đề xuất hòa giải mà không được chấp nhận.

## Thay đổi thực hiện

### 1. Backend Changes

#### Controller (`lvtn_be/src/controllers/dispute-document-export.controller.ts`)
- ✅ Cập nhật quyền truy cập: cho phép `CLIENT`, `FREELANCER`, và `ADMIN` sử dụng API
- ✅ Thêm kiểm tra quyền truy cập dựa trên user ID và role
- ✅ Truyền thông tin user vào service để kiểm tra quyền

#### Service (`lvtn_be/src/services/dispute-document-export.service.ts`)
- ✅ Thêm tham số `userId` và `userRole` vào các hàm chính
- ✅ Kiểm tra quyền truy cập: chỉ cho phép participant của dispute truy cập
- ✅ Đảm bảo non-admin users chỉ có thể truy cập dispute mà họ tham gia

### 2. Frontend Changes

#### Component mới (`lvtn_fe/src/components/dispute-export/UserDisputeExportPanel.tsx`)
- ✅ Giao diện xuất tài liệu dành riêng cho Freelancer và Client
- ✅ Kiểm tra điều kiện xuất tài liệu (ít nhất 2 lần admin đề xuất bị từ chối)
- ✅ Hai tùy chọn xuất: HTML/PDF và JSON
- ✅ Thông báo hướng dẫn sử dụng tài liệu cho mục đích pháp lý

#### Tích hợp vào trang Dispute Room (`lvtn_fe/src/pages/Contracts/DisputeRoom/ContractDisputeRoomPage.tsx`)
- ✅ Thêm component `UserDisputeExportPanel` vào tab "Hồ sơ & chứng cứ"
- ✅ Chỉ hiển thị cho CLIENT và FREELANCER (không hiển thị cho ADMIN)
- ✅ Kiểm tra quyền participant trước khi hiển thị

## Điều kiện xuất tài liệu

### Cho Admin (như trước):
- Dispute ở trạng thái `INTERNAL_MEDIATION`
- Có ít nhất 2 lần đề xuất hòa giải bị từ chối

### Cho Freelancer/Client (mới):
- ✅ Phải là participant của dispute (client hoặc freelancer của contract)
- ✅ Dispute ở trạng thái `INTERNAL_MEDIATION`
- ✅ Có ít nhất 2 lần admin đề xuất hòa giải bị từ chối
- ✅ Không thể truy cập dispute của người khác

## Bảo mật

### Kiểm tra quyền truy cập:
1. **Authentication**: Phải đăng nhập với role CLIENT, FREELANCER, hoặc ADMIN
2. **Authorization**: 
   - Admin: có thể truy cập tất cả dispute
   - Client/Freelancer: chỉ có thể truy cập dispute mà họ tham gia
3. **Data validation**: Kiểm tra dispute tồn tại và có đúng cấu trúc

### Luồng kiểm tra:
```
User Request → Authentication → Role Check → Participant Check → Eligibility Check → Data Access
```

## Giao diện người dùng

### Vị trí hiển thị:
- **Trang**: Contract Dispute Room
- **Tab**: "Hồ sơ & chứng cứ" (Evidence)
- **Điều kiện**: Chỉ hiển thị khi dispute ở trạng thái `INTERNAL_MEDIATION`

### Tính năng:
1. **Kiểm tra điều kiện**: Hiển thị trạng thái có thể xuất hay không
2. **Xuất HTML/PDF**: Mở cửa sổ mới để in hoặc lưu thành PDF
3. **Xuất JSON**: Tải xuống dữ liệu thô cho mục đích kỹ thuật
4. **Thông tin hướng dẫn**: Giải thích cách sử dụng tài liệu cho mục đích pháp lý

### Thông báo cho người dùng:
- ✅ Trạng thái điều kiện xuất (đủ điều kiện / chưa đủ điều kiện)
- ✅ Hướng dẫn sử dụng tài liệu cho thủ tục pháp lý
- ✅ Gợi ý tham khảo ý kiến luật sư

## API Endpoints

Các endpoint hiện tại đã được cập nhật để hỗ trợ Freelancer và Client:

```
GET /dispute-document-export/:disputeId/eligibility
- Kiểm tra điều kiện xuất tài liệu
- Quyền: ADMIN, CLIENT, FREELANCER (chỉ dispute của họ)

GET /dispute-document-export/:disputeId/package
- Lấy gói tài liệu tranh chấp đầy đủ
- Quyền: ADMIN, CLIENT, FREELANCER (chỉ dispute của họ)

POST /dispute-document-export/:disputeId/close
- Đóng hồ sơ hòa giải (chỉ ADMIN)
- Quyền: ADMIN only
```

## Luồng sử dụng

### Cho Freelancer/Client:
1. Vào trang Dispute Room của contract
2. Chuyển sang tab "Hồ sơ & chứng cứ"
3. Nếu đủ điều kiện, sẽ thấy panel "Xuất tài liệu tranh chấp"
4. Chọn định dạng xuất (HTML/PDF hoặc JSON)
5. Sử dụng tài liệu cho mục đích pháp lý bên ngoài

### Điều kiện kích hoạt:
- Admin đã đề xuất hòa giải ít nhất 2 lần
- Cả 2 lần đề xuất đều bị từ chối bởi ít nhất một bên
- Dispute vẫn ở trạng thái `INTERNAL_MEDIATION`

## Lợi ích

1. **Minh bạch**: Người dùng có thể xuất tài liệu khi hòa giải nội bộ thất bại
2. **Hỗ trợ pháp lý**: Tài liệu đầy đủ để sử dụng cho các thủ tục bên ngoài
3. **Tự chủ**: Không cần chờ admin xuất tài liệu
4. **Bảo mật**: Chỉ participant mới có thể truy cập dispute của họ

## Status: ✅ HOÀN THÀNH

Tính năng đã được triển khai đầy đủ và sẵn sàng sử dụng.