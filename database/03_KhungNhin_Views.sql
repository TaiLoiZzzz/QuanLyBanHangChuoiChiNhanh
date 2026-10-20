-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 3: XÂY DỰNG 5 KHUNG NHÌN (VIEWS) CHUYÊN SÂU & TỐI ƯU DATABASE ENGINE
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. XÓA CÁC VIEW CŨ NẾU ĐÃ TỒN TẠI (THEO THỨ TỰ)
IF OBJECT_ID('v_TongHopDoanhThuSanPham', 'V') IS NOT NULL DROP VIEW v_TongHopDoanhThuSanPham;
IF OBJECT_ID('v_InHoaDon_ChiTietPhucHop', 'V') IS NOT NULL DROP VIEW v_InHoaDon_ChiTietPhucHop;
IF OBJECT_ID('v_NhanVien_ChiNhanh1_KiemSoat', 'V') IS NOT NULL DROP VIEW v_NhanVien_ChiNhanh1_KiemSoat;
IF OBJECT_ID('v_PhanCapNhanSu_ToanDien', 'V') IS NOT NULL DROP VIEW v_PhanCapNhanSu_ToanDien;
IF OBJECT_ID('v_BaoCaoTonKho_XepHang', 'V') IS NOT NULL DROP VIEW v_BaoCaoTonKho_XepHang;
IF OBJECT_ID('v_BaoCaoTonKhoTheoChiNhanh', 'V') IS NOT NULL DROP VIEW v_BaoCaoTonKhoTheoChiNhanh;
IF OBJECT_ID('v_NhanVien_CongKhai', 'V') IS NOT NULL DROP VIEW v_NhanVien_CongKhai;
GO

-- =========================================================================
-- VIEW 1: BÁO CÁO TỒN KHO & XẾP HẠNG NGUY CƠ HẾT HÀNG (WINDOW FUNCTIONS)
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- Kỹ thuật chuyên sâu:
--   - Dùng DENSE_RANK() OVER (PARTITION BY cn.MaCN ORDER BY tk.SoLuongTon ASC) để xếp hạng sản phẩm cạn kho nhất
--   - Dùng SUM(...) OVER (PARTITION BY k.MaKho) để tính % tỷ trọng chiếm dụng kho
--   - CASE WHEN phân loại trạng thái tồn kho
-- =========================================================================
CREATE VIEW v_BaoCaoTonKho_XepHang
AS
SELECT 
    cn.MaCN,
    cn.TenCN,
    k.MaKho,
    k.TenKho,
    sp.MaSP,
    sp.TenSP,
    dm.TenDM,
    sp.DonViTinh,
    tk.SoLuongTon,
    sp.GiaBanHienTai,
    (tk.SoLuongTon * sp.GiaBanHienTai) AS TongGiaTriTonKho,
    -- Tính % lượng hàng món này chiếm trong tổng số lượng hàng của cả kho (ép kiểu DECIMAL(5,2) chuẩn hóa)
    CAST(ROUND(100.0 * tk.SoLuongTon / NULLIF(SUM(tk.SoLuongTon) OVER(PARTITION BY k.MaKho), 0), 2) AS DECIMAL(5,2)) AS TyTrongTonKhoPct,
    -- Xếp hạng độ khan hiếm trong từng chi nhánh (Rank 1 = Sắp hết nhất)
    DENSE_RANK() OVER (
        PARTITION BY cn.MaCN 
        ORDER BY tk.SoLuongTon ASC
    ) AS HangKhanHiemTaiChiNhanh,
    CASE 
        WHEN tk.SoLuongTon = 0 THEN N'HẾT HÀNG'
        WHEN tk.SoLuongTon < 10 THEN N'CẢNH BÁO: Sắp hết'
        WHEN tk.SoLuongTon BETWEEN 10 AND 30 THEN N'Tồn trung bình'
        ELSE N'Tồn dồi dào'
    END AS TrangThaiTonKho
FROM ChiNhanh cn
INNER JOIN KhoHang k ON cn.MaCN = k.MaCN
INNER JOIN TonKho tk ON k.MaKho = tk.MaKho
INNER JOIN SanPham sp ON tk.MaSP = sp.MaSP
INNER JOIN DanhMuc dm ON sp.MaDM = dm.MaDM
WHERE sp.DaXoa = 0;
GO

PRINT N'Da tao thanh cong VIEW 1: v_BaoCaoTonKho_XepHang';
GO

-- =========================================================================
-- VIEW 2: PHÂN CẤP NHÂN SỰ & QUẢN TRỊ ĐỘI NGŨ (SELF-JOIN + AGGREGATION)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Kỹ thuật chuyên sâu:
--   - Self LEFT JOIN giải mã cây phân cấp sếp - lính (MaQL -> HoTen)
--   - Tương quan đếm số lượng nhân viên cấp dưới trực tiếp mà người đó quản lý
--   - Bảo mật mức cột: Không để lộ số lương của từng người
-- =========================================================================
CREATE VIEW v_PhanCapNhanSu_ToanDien
AS
SELECT 
    nv.MaNV,
    nv.HoTen AS TenNhanVien,
    cn.MaCN,
    cn.TenCN AS ChiNhanhLamViec,
    nv.MaQL,
    ISNULL(ql.HoTen, N'(Ban Giám Đốc)') AS NguoiQuanLyTrucTiep,
    -- Đếm số nhân sự cấp dưới trực tiếp do nhân viên này làm sếp
    (SELECT COUNT(*) FROM NhanVien subordinate WHERE subordinate.MaQL = nv.MaNV AND subordinate.DaXoa = 0) AS SoNhanVienDuoiQuyen,
    -- Tính tổng số nhân sự đang làm việc tại cùng chi nhánh đó
    COUNT(*) OVER(PARTITION BY nv.MaCN) AS TongNhanSuChiNhanh
FROM NhanVien nv
INNER JOIN ChiNhanh cn ON nv.MaCN = cn.MaCN
LEFT JOIN NhanVien ql ON nv.MaQL = ql.MaNV
WHERE nv.DaXoa = 0;
GO

PRINT N'Da tao thanh cong VIEW 2: v_PhanCapNhanSu_ToanDien';
GO

-- =========================================================================
-- VIEW 3: PHÂN VÙNG QUẢN LÝ NHÂN VIÊN CHI NHÁNH 1 (WITH CHECK OPTION)
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
-- Kỹ thuật chuyên sâu:
--   - Phân quyền theo hàng (Row-level Security / Partition View) cho Quản lý Chi nhánh 1
--   - Cho phép UPDATE qua View nhưng ràng buộc WITH CHECK OPTION cấm sửa đổi MaCN sang chi nhánh khác!
-- =========================================================================
CREATE VIEW v_NhanVien_ChiNhanh1_KiemSoat
AS
SELECT 
    MaNV,
    HoTen,
    MaCN,
    MaQL,
    DaXoa
FROM NhanVien
WHERE MaCN = 1
WITH CHECK OPTION; -- Cấm UPDATE/INSERT bản ghi có MaCN <> 1 qua View này!
GO

PRINT N'Da tao thanh cong VIEW 3: v_NhanVien_ChiNhanh1_KiemSoat (WITH CHECK OPTION)';
GO

-- =========================================================================
-- VIEW 4: IN HÓA ĐƠN BÁN HÀNG PHỨC HỢP (COMPOSITE JOIN 5 BẢNG + TÍNH TOÁN)
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
-- Kỹ thuật chuyên sâu:
--   - Kết nối 5 bảng: DonHang -> KhachHang -> NhanVien -> KhoHang -> ChiTietDonHang -> SanPham
--   - Tính mức chiết khấu tự động theo phân hạng khách hàng (VIP = 10%, Thường = 0%)
--   - Tính thuế VAT 8% và Tổng tiền thanh toán thực tế (Final Total)
-- =========================================================================
CREATE VIEW v_InHoaDon_ChiTietPhucHop
AS
SELECT 
    dh.MaDH,
    dh.NgayDat,
    CASE dh.TrangThai
        WHEN 0 THEN N'Đơn mới tạo'
        WHEN 1 THEN N'Đã xác nhận'
        WHEN 2 THEN N'Đang giao hàng'
        WHEN 3 THEN N'Giao thành công'
        WHEN 4 THEN N'Đã hủy'
        ELSE N'Không xác định'
    END AS TenTrangThai,
    -- Thông tin khách hàng & Chiết khấu
    kh.MaKH,
    kh.HoTen AS TenKhachHang,
    kh.SoDT AS SoDTKhachHang,
    CASE dh.TiLeChietKhau
        WHEN 0.10 THEN N'Khách VIP (Giảm 10%)'
        WHEN 0.15 THEN N'Khách Kim Cương (Giảm 15%)'
        ELSE N'Khách Thường (Không giảm)'
    END AS HangThanhVien,
    -- Thông tin nhân viên & Kho xuất
    nv.HoTen AS NhanVienLapDon,
    k.TenKho AS KhoXuatHang,
    -- Thông tin chi tiết sản phẩm
    sp.MaSP,
    sp.TenSP,
    sp.DonViTinh,
    ct.SoLuong,
    ct.DonGiaBan,
    ct.ThanhTien AS TienGoc,
    -- Tính tiền chiết khấu theo loại khách hàng
    ROUND(ct.ThanhTien * dh.TiLeChietKhau, 0) AS TienChietKhau,
    -- Tính tiền sau chiết khấu
    ROUND(ct.ThanhTien * (1 - dh.TiLeChietKhau), 0) AS TienSauChietKhau,
    -- Thuế VAT 8%
    ROUND(ct.ThanhTien * (1 - dh.TiLeChietKhau) * dh.TiLeVAT, 0) AS ThueVAT8Pct,
    -- Thành tiền cuối cùng đã bao gồm VAT
    ROUND(ct.ThanhTien * (1 - dh.TiLeChietKhau), 0) + ROUND(ct.ThanhTien * (1 - dh.TiLeChietKhau) * dh.TiLeVAT, 0) AS TongThanhToanCuoiCung
FROM DonHang dh
INNER JOIN KhachHang kh ON dh.MaKH = kh.MaKH
INNER JOIN NhanVien nv ON dh.MaNV = nv.MaNV
INNER JOIN KhoHang k ON dh.MaKhoXuat = k.MaKho
INNER JOIN ChiTietDonHang ct ON dh.MaDH = ct.MaDH
INNER JOIN SanPham sp ON ct.MaSP = sp.MaSP;
GO

PRINT N'Da tao thanh cong VIEW 4: v_InHoaDon_ChiTietPhucHop';
GO

-- =========================================================================
-- VIEW 5: TỔNG HỢP DOANH THU SẢN PHẨM (INDEXED VIEW - ĐỈNH CAO DATABASE ENGINE)
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
-- Kỹ thuật chuyên sâu:
--   - Bắt buộc dùng WITH SCHEMABINDING (khóa cứng metadata)
--   - Bắt buộc dùng COUNT_BIG(*) khi có GROUP BY
--   - TẠO UNIQUE CLUSTERED INDEX LÊN VIEW ĐỂ LƯU KẾT QUẢ VẬT LÝ VÀO ĐĨA!
-- =========================================================================
CREATE VIEW v_TongHopDoanhThuSanPham
WITH SCHEMABINDING
AS
SELECT 
    ct.MaSP,
    COUNT_BIG(*) AS SoLanXuatHienTrongDon,
    SUM(ct.SoLuong) AS TongSoLuongBan,
    SUM(ISNULL(ROUND(ct.ThanhTien * (1-dh.TiLeChietKhau),0),0)) AS TongDoanhThuThuVe
FROM dbo.ChiTietDonHang ct
INNER JOIN dbo.DonHang dh ON dh.MaDH=ct.MaDH
WHERE dh.TrangThai=3
GROUP BY ct.MaSP;
GO

-- TẠO CLUSTERED INDEX VẬT LÝ BIẾN VIEW NÀY THÀNH INDEXED VIEW
CREATE UNIQUE CLUSTERED INDEX IX_v_TongHopDoanhThuSanPham_MaSP
ON v_TongHopDoanhThuSanPham(MaSP);
GO

PRINT N'Da tao thanh cong VIEW 5: v_TongHopDoanhThuSanPham (INDEXED VIEW CO CLUSTERED INDEX)';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 VIEW CHUYEN SAU DAT CHUAN CUA CO THE!';
PRINT N'=========================================================================';
GO

-- POS directory: identity and organization only, never salary.
CREATE OR ALTER VIEW dbo.v_NhanVien_BanHang AS
SELECT nv.MaNV,nv.HoTen,nv.MaCN,cn.TenCN,nv.MaQL,ql.HoTen AS TenNguoiQuanLy,nv.DaXoa
FROM dbo.NhanVien nv JOIN dbo.ChiNhanh cn ON cn.MaCN=nv.MaCN
LEFT JOIN dbo.NhanVien ql ON ql.MaNV=nv.MaQL
WHERE nv.DaXoa=0;
GO
