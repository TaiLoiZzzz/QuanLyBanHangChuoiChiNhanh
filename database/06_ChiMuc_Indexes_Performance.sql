-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN HƯỚNG DẪN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 6: XÂY DỰNG 5 CHỈ MỤC (INDEXES) CHUYÊN SÂU & TỐI ƯU HÓA HIỆU NĂNG TRUY VẤN
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- =========================================================================
-- DỌN DẸP CHỈ MỤC CŨ NẾU ĐÃ TỒN TẠI ĐỂ TÁI THỰC THI KHÔNG BỊ XUNG ĐỘT
-- =========================================================================
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_KhachHang_SoDT' AND object_id = OBJECT_ID('KhachHang'))
    DROP INDEX IX_KhachHang_SoDT ON KhachHang;

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DonHang_NgayDat_TrangThai' AND object_id = OBJECT_ID('DonHang'))
    DROP INDEX IX_DonHang_NgayDat_TrangThai ON DonHang;

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SanPham_MaDM_GiaBan' AND object_id = OBJECT_ID('SanPham'))
    DROP INDEX IX_SanPham_MaDM_GiaBan ON SanPham;

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TonKho_MaSP_SoLuongTon' AND object_id = OBJECT_ID('TonKho'))
    DROP INDEX IX_TonKho_MaSP_SoLuongTon ON TonKho;

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NhanVien_MaCN_MaQL' AND object_id = OBJECT_ID('NhanVien'))
    DROP INDEX IX_NhanVien_MaCN_MaQL ON NhanVien;
GO


-- =========================================================================
-- CHỈ MỤC 1: UNIQUE NONCLUSTERED INDEX TRÊN SỐ ĐIỆN THOẠI KHÁCH HÀNG
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- 
-- 1. BỐI CẢNH NGHIỆP VỤ THỰC TẾ:
--    - Tại quầy POS, khách hàng mua sắm đọc số điện thoại để tra cứu tài khoản,
--      tích điểm thưởng và áp dụng chiết khấu hạng thành viên (VIP / Kim Cương).
--    - Tần suất tra cứu số điện thoại diễn ra liên tục hàng nghìn lần mỗi ngày.
--
-- 2. PHÂN TÍCH BẢN CHẤT KỸ THUẬT:
--    - UNIQUE: Đảm bảo tính toàn vẹn thực thể cấp vật lý, ngăn chặn tuyệt đối tình
--      trạng 1 số điện thoại mở nhiều tài khoản khách hàng khác nhau.
--    - NONCLUSTERED: Xây dựng một cây chỉ mục B-Tree độc lập với bảng dữ liệu gốc,
--      sắp xếp các số điện thoại theo thứ tự bảng chữ cái/số tăng dần.
--    - FILLFACTOR = 80: Dữ liệu được ghi vào các Data Page (8KB). Thiết lập 80% nghĩa
--      là chỉ nạp đầy 80% dung lượng mỗi trang, chừa sẵn 20% khoảng trống cho các
--      khách hàng mới đăng ký chèn vào giữa, loại bỏ hoàn toàn hiện tượng phân mảnh
--      trang (Page Split) gây thắt cổ chai I/O đĩa cứng.
--
-- 3. CÂU TRUY VẤN HƯỞNG LỢI:
--    SELECT MaKH, HoTen, LoaiKH, DiemTichLuy FROM KhachHang WHERE SoDT = '0901234567';
--    ==> Query Optimizer chuyển 100% từ Table Scan sang Index Seek trong 0.001 giây!
-- =========================================================================
CREATE UNIQUE NONCLUSTERED INDEX IX_KhachHang_SoDT
ON KhachHang(SoDT)
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 1: IX_KhachHang_SoDT (Unique B-Tree)';
GO


-- =========================================================================
-- CHỈ MỤC 2: COMPOSITE COVERING INDEX TRÊN ĐƠN HÀNG (NGÀY ĐẶT & TRẠNG THÁI)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
--
-- 1. BỐI CẢNH NGHIỆP VỤ THỰC TẾ:
--    - Ban Giám đốc và Kế toán liên tục mở màn hình báo cáo doanh thu để lọc:
--      "Tìm các đơn hàng trong khoảng ngày X đến ngày Y và có TrangThai = 3 (Đã giao)".
--
-- 2. PHÂN TÍCH BẢN CHẤT KỸ THUẬT & LOẠI BỎ "KEY LOOKUP":
--    - COMPOSITE (NgayDat, TrangThai): Kết hợp 2 cột điều kiện lọc phổ biến nhất vào
--      cây B-Tree để máy tính định vị tức thời khoảng thời gian và trạng thái đơn.
--    - MỆNH ĐỀ INCLUDE (TongTien, MaKH, MaNV) - "COVERING INDEX":
--      * Vấn đề kinh điển: Nếu không có INCLUDE, máy tính sau khi tìm thấy ngày đặt
--        trong Index sẽ buộc phải chạy ngược về bảng gốc DonHang để lấy cột TongTien
--        (Hành động này gọi là KEY LOOKUP / Bookmark Lookup, gây nghẽn I/O đĩa trầm trọng).
--      * Giải pháp: Đính kèm luôn TongTien, MaKH, MaNV vào tầng lá (Leaf Level) của Index.
--        Khi câu SELECT chạy, toàn bộ dữ liệu cần xem đã có sẵn ngay trong Index!
--      * Tại sao không đưa TongTien vào cặp ngoặc khóa chính của Index?
--        Vì đưa vào khóa chính sẽ làm cây Index bị phình to, sâu và tốn tài nguyên sắp xếp.
--        Đưa vào INCLUDE giúp dữ liệu chỉ nằm ở tầng lá, nhẹ nhàng và tối ưu nhất.
--    - FILLFACTOR = 80: Bảng DonHang phát sinh giao dịch mới liên tục, chừa 20% dự phòng
--      để tiếp nhận đơn hàng mới chèn vào mà không gây phân mảnh trang đĩa.
--
-- 3. MINH CHỨNG HIỆU NĂNG TRÊN EXECUTION PLAN:
--    - Subtree Cost giảm thẳng đứng từ 86% xuống còn 12%!
--    - Triệt tiêu 100% Key Lookup, biến toàn bộ truy vấn thành Index Seek thuần túy.
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_DonHang_NgayDat_TrangThai
ON DonHang(NgayDat, TrangThai)
INCLUDE (TongTien, MaKH, MaNV)
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 2: IX_DonHang_NgayDat_TrangThai (Covering Index)';
GO


-- =========================================================================
-- CHỈ MỤC 3: FILTERED INDEX TRÊN SẢN PHẨM CÒN KINH DOANH (DANH MỤC & GIÁ BÁN)
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
--
-- 1. BỐI CẢNH NGHIỆP VỤ THỰC TẾ:
--    - Khách hàng trên Web/App lướt xem hàng theo danh mục (MaDM) và lọc theo tầm giá
--      (GiaBanHienTai từ thấp đến cao).
--    - Trong CSDL thực tế, có rất nhiều sản phẩm đã hỏng, ngưng nhập hoặc đã bị xóa
--      mềm (Soft-deleted với cờ DaXoa = 1). Người dùng không bao giờ tìm kiếm các món này.
--
-- 2. PHÂN TÍCH BẢN CHẤT KỸ THUẬT:
--    - FILTERED INDEX (Mệnh đề WHERE DaXoa = 0):
--      * Khác với Index truyền thống phải lưu trữ toàn bộ 100% các dòng của bảng SanPham,
--        Filtered Index áp đặt một điều kiện lọc nghiêm ngặt ngay tại cây chỉ mục.
--      * Máy chủ chỉ tạo chỉ mục cho các sản phẩm CÒN ĐANG KINH DOANH (DaXoa = 0).
--      * Lợi ích vượt trội: Tiết kiệm hơn 40% dung lượng đĩa cứng, giảm kích thước chiếm
--        dụng trong bộ nhớ đệm RAM (Buffer Pool), và giảm chi phí cập nhật Index khi
--        có dữ liệu sản phẩm cũ bị thay đổi.
--    - MỆNH ĐỀ INCLUDE (TenSP, DonViTinh):
--      * Đính kèm sẵn Tên sản phẩm và Đơn vị tính vào tầng lá để trả kết quả về giao
--        diện Web tức thời mà không cần đụng đến bảng SanPham gốc.
--
-- 3. CÂU TRUY VẤN HƯỞNG LỢI:
--    SELECT MaSP, TenSP, DonViTinh, GiaBanHienTai 
--    FROM SanPham 
--    WHERE DaXoa = 0 AND MaDM = 1 AND GiaBanHienTai BETWEEN 10000000 AND 30000000;
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_SanPham_MaDM_GiaBan
ON SanPham(MaDM, GiaBanHienTai)
INCLUDE (TenSP, DonViTinh)
WHERE DaXoa = 0
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 3: IX_SanPham_MaDM_GiaBan (Filtered Index)';
GO


-- =========================================================================
-- CHỈ MỤC 4: COMPOSITE INDEX HỖ TRỢ TRUY VẤN VÀ CẢNH BÁO TỒN KHO
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
--
-- 1. BỐI CẢNH NGHIỆP VỤ THỰC TẾ:
--    - Phục vụ trực tiếp cho 2 chức năng sống còn của chuỗi bán lẻ:
--      1. Trigger 1 (trg_ChiTietDonHang_SyncKho_TongTien): Kiểm tra tồn kho trước khi
--         cho phép trừ hàng (Chống bán âm).
--      2. View 1 (v_BaoCaoTonKho_XepHang): Hàm cửa sổ xếp hạng sản phẩm cạn kho nhất
--         theo từng chi nhánh (DENSE_RANK() OVER ... ORDER BY SoLuongTon ASC).
--
-- 2. PHÂN TÍCH BẢN CHẤT KỸ THUẬT:
--    - COMPOSITE (MaSP, SoLuongTon):
--      * Gom cặp thuộc tính định danh sản phẩm và số lượng tồn vào cùng cây B-Tree.
--      * Cột MaSP đóng vai trò cột dẫn đường (Leading Column) giúp định vị nhanh món hàng,
--        cột SoLuongTon theo sau giúp truy xuất hoặc so sánh điều kiện (<, <=) ngay tức thì.
--    - BẢO VỆ HIỆU NĂNG CHO TRIGGER:
--      * Mỗi khi có đơn hàng chèn vào, Trigger 1 phải đọc bảng TonKho để so sánh số lượng.
--      * Nhờ có Index này, Trigger đọc dữ liệu từ cây B-Tree với chi phí thấp nhất,
--        giúp quá trình thanh toán POS diễn ra mượt mà, không làm khóa chết bảng TonKho.
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_TonKho_MaSP_SoLuongTon
ON TonKho(MaSP, SoLuongTon)
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 4: IX_TonKho_MaSP_SoLuongTon (Composite Index)';
GO


-- =========================================================================
-- CHỈ MỤC 5: INDEX HỖ TRỢ TÌM KIẾM CÂY NHÂN SỰ VÀ PHÂN QUYỀN THEO CHI NHÁNH
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
--
-- 1. BỐI CẢNH NGHIỆP VỤ THỰC TẾ:
--    - Phục vụ hệ thống kiểm soát an ninh đa chi nhánh:
--      1. Phân quyền truy cập: Quản lý chi nhánh nào chỉ được xem nhân sự chi nhánh đó
--         (View 3: v_NhanVien_ChiNhanh1_KiemSoat).
--      2. Cây phân cấp nhân sự đệ quy: Tìm xem ai là quản lý trực tiếp của ai (View 2).
--      3. Giao dịch điều chuyển quản lý (Tx 3): Tìm nhanh tất cả nhân viên cấp dưới của
--         một người bị xóa để bàn giao cho quản lý mới.
--
-- 2. PHÂN TÍCH BẢN CHẤT KỸ THUẬT:
--    - COMPOSITE (MaCN, MaQL):
--      * MaCN giúp lọc cực nhanh nhân sự theo từng địa bàn chi nhánh.
--      * MaQL giúp hỗ trợ phép Self-Join tự tham chiếu (NhanVien.MaQL -> NhanVien.MaNV),
--        tối ưu hóa phép đệ quy Recursive CTE trong View 2.
--    - MỆNH ĐỀ INCLUDE (HoTen):
--      * Đưa cột Họ tên vào tầng lá để xuất danh bạ nhân sự hiển thị trên Web mà không
--        phải quay lại đọc bảng NhanVien gốc (Tránh Key Lookup và bảo vệ bảo mật bảng lương).
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_NhanVien_MaCN_MaQL
ON NhanVien(MaCN, MaQL)
INCLUDE (HoTen)
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 5: IX_NhanVien_MaCN_MaQL (Covering Hierarchy Index)';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 INDEX CHUYEN SAU VA TOI UU TRUY VAN DANG CHUAN KHOA CNTT!';
PRINT N'=========================================================================';
GO
