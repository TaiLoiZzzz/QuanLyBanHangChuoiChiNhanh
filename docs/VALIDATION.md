# Kiểm tra đợt sửa 20/10/2026

Đã kiểm tra cục bộ bằng Node 25.8.1, Azure SQL Edge 15.0.2000.1574 ARM64:

- 9 unit test: tổng hóa đơn nhiều dòng, role theo kết quả server, session/logout, validation, SQL sinh tự động và chặn tên CSDL hệ thống.
- 35 nhóm kiểm thử tích hợp trên CSDL/login ngẫu nhiên, tự dọn sau chạy. Có kiểm tra các luồng auth/RBAC, CRUD giới hạn quyền, nhập/chuyển kho hai chiều, bán hàng đồng thời và tranh chấp giao/hủy, hoàn kho một lần, dữ liệu bất biến, báo cáo, 5.000 đơn mẫu, nâng cấp schema cũ, idempotency migration, rollback và full/point-in-time restore.
- Build React/Vite thành công; SQL sinh tự động không lệch file thành phần; `git diff --check` sạch.
- `npm audit` backend/frontend không có cảnh báo sau cập nhật dependency.
- Đã thao tác trình duyệt trên CSDL riêng: hóa đơn hai dòng 650.000 + VAT 52.000 = 702.000; Thu ngân tạo đơn 300.000 thành công và Quản lý thêm sản phẩm qua procedure.

Workflow `.github/workflows/verify.yml` chạy lại unit, build, audit và integration trên SQL Server 2022 x86-64. Kết quả cục bộ ARM64 không được xem là thay thế cho kết quả workflow hoặc thử trên máy nộp bài. Các ca kiểm thử không chứng minh đã phủ mọi trạng thái, tải dài hạn hoặc cấu hình triển khai.

Migration và các test không tự sửa CSDL ứng dụng đang có. Cần theo README, giữ backup độc lập, đối soát dữ liệu lịch sử và chạy `npm run db:migrate` trong cửa sổ bảo trì trước khi dùng backend mới với schema cũ.
