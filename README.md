# Nền tảng kết nối khách hàng & freelancer

Dự án này là giao diện web xây dựng bằng React + TypeScript dành cho nền tảng quản lý công việc, giúp khách hàng đăng dự án, freelancer tìm kiếm việc làm và đội ngũ quản trị vận hành hệ thống. Ứng dụng hỗ trợ quy trình từ tạo tài khoản, hoàn tất onboarding, đăng tin tuyển dụng, đề xuất/đàm phán, ký hợp đồng cho tới thanh toán thông qua Stripe.

## Công nghệ chính

- ⚛️ **React 19** + **TypeScript** + **Vite** cho trải nghiệm phát triển nhanh, HMR và build tối ưu.
- 🎨 **Tailwind CSS 4** kết hợp **DaisyUI** để xây dựng UI linh hoạt và tuân thủ thiết kế responsive.
- 🗃 **Redux Toolkit** + **Redux Persist** quản lý trạng thái toàn cục và lưu trữ phiên đăng nhập.
- 🔁 **TanStack Query** đồng bộ hóa dữ liệu server, caching và quản lý trạng thái bất đồng bộ.
- ✅ **React Hook Form** + **Zod** để xây dựng form phức tạp với kiểm tra dữ liệu mạnh mẽ.
- 💳 **Stripe** (Connect) cho dòng tiền và nhận thanh toán.
- 💬 **socket.io-client** phục vụ chat công việc theo thời gian thực.

## Chức năng nổi bật

- **Quy trình xác thực & onboarding** cho khách hàng, freelancer; kiểm soát quyền truy cập thông qua middleware router.
- **Bảng điều khiển Admin** quản lý danh mục, chuyên môn, kỹ năng và các cấu phần hệ thống.
- **Không gian làm việc hợp đồng** (Contract Workroom) với chat và cập nhật tiến độ.
- **Quản lý bài đăng tuyển**: khách hàng tạo, chỉnh sửa, duyệt freelancer và gửi offer.
- **Chợ việc cho freelancer**: tìm kiếm, lưu job, gửi proposal, theo dõi lời mời.
- **Thiết lập tài khoản & thanh toán**: cấu hình phương thức thanh toán, nhận tiền qua Stripe.

## Yêu cầu môi trường

- Node.js ≥ 18 (khuyến nghị 20 LTS).
- npm ≥ 9.
- Stripe account (nếu muốn thử luồng thanh toán).

## Thiết lập & chạy dự án

```bash
# Cài đặt phụ thuộc
npm install

# Khởi động môi trường phát triển (http://localhost:5173)
npm run dev

# Chạy linter
npm run lint

# Build production
npm run build

# Xem thử bản build
npm run preview
```

## Cấu hình biến môi trường

Tạo file `.env` ở thư mục gốc (cùng cấp `package.json`) với các biến sau:

```bash
VITE_API_ROOT_URL="https://api.example.com/api"
VITE_SOCKET_ROOT_URL="https://api.example.com"
VITE_STRIPE_PUBLIC_KEY="pk_test_xxx"
```

- `VITE_API_ROOT_URL`: endpoint REST chính của backend.
- `VITE_SOCKET_ROOT_URL`: url cho kết nối socket.io (mặc định suy ra từ API nếu bỏ trống).
- `VITE_STRIPE_PUBLIC_KEY`: public key cho Stripe Elements/Connect.

## Cấu trúc thư mục chính

```text
src/
├─ apis/                # Khai báo axios client & endpoint cho các domain (auth, job, contract...)
├─ components/          # Thành phần giao diện dùng lại (table, modal, input...)
├─ config/              # Cấu hình môi trường, routes, axios...
├─ contexts/            # React context (ví dụ ChatSocketProvider)
├─ layouts/             # Layout cho Common, Admin, Job chat, Settings...
├─ middlewares/         # Logic kiểm tra quyền truy cập dùng cho router
├─ pages/               # Trang chức năng: Auth, Client, Freelancer, Admin, Contract...
├─ redux/               # Store, slice, middleware redux toolkit
├─ routes/              # Định nghĩa router & guards
├─ utils/               # Hàm tiện ích, hook hỗ trợ
└─ tailwind.config.css  # Các biến theme Tailwind toàn cục
```

## Quy ước & best practices

- Sử dụng absolute import với alias `~` trỏ tới `src` (được cấu hình trong `tsconfig` và Vite).
- Tổ chức logic server state thông qua TanStack Query (hooks ở `hooks/` hoặc ngay trong page).
- Tất cả request nên đi qua các module trong `src/apis` để đảm bảo dùng chung interceptor, token.
- Form sử dụng `react-hook-form` kết hợp `@hookform/resolvers/zod` để tránh lỗi runtime.
- Thông báo sử dụng `react-toastify` (đã cấu hình tại `App.tsx`).

## Kiểm thử & chất lượng mã

- ESLint (TypeScript + React hooks rules) đảm bảo tuân thủ chuẩn mã hóa.
- Khi thêm tính năng mới, ưu tiên viết hook/service riêng để dễ tái sử dụng và test.

## Đóng góp

1. Fork dự án & tạo branch mới theo chuẩn `feature/<ten>`.
2. Triển khai tính năng, đảm bảo code pass `npm run lint`.
3. Tạo Pull Request mô tả chi tiết thay đổi và ảnh màn hình (nếu có UI).

---

Nếu bạn có thắc mắc hoặc muốn mở issue, hãy liên hệ đội phát triển qua hệ thống quản lý dự án nội bộ.
