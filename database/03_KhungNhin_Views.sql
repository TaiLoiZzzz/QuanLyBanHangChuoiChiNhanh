-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 3: XÂY DỰNG 5 KHUNG NHÌN (VIEWS) CHUẨN DOANH NGHIỆP & BẢO MẬT
-- NGƯỜI PHỤ TRÁCH: QUÁCH TÀI LỢI (70%) - HỖ TRỢ: PHAN THIỆN KHỞI (7.5%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- XÓA VIEW NẾU ĐÃ TỒN TẠI ĐỂ CHẠY LẠI KHÔNG BỊ LỖI
IF OBJECT_ID('v_BaoCaoTonKhoTheoChiNhanh', 'V') IS NOT NULL 
    DROP VIEW v_BaoCaoTonKhoTheoChiNhanh;
GO

-- =========================================================================
-- VIEW 1: BÁO CÁO TỒN KHO THEO CHI NHÁNH & CẢNH BÁO HẾT HÀNG
-- Nghiệp vụ: Giúp Quản lý chuỗi giám sát số lượng và giá trị tồn kho theo thời gian thực
-- Kỹ thuật: Multi-table JOIN, Cột tính toán Giá trị tồn kho, Phân loại cảnh báo bằng CASE WHEN
-- =========================================================================
CREATE VIEW v_BaoCaoTonKhoTheoChiNhanh
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
    CASE 
        WHEN tk.SoLuongTon = 0 THEN N'HẾT HÀNG'
        WHEN tk.SoLuongTon < 10 THEN N'CẢNH BÁO: Sắp hết'
        WHEN tk.SoLuongTon BETWEEN 10 AND 30 THEN N'Tồn trung bình'
        ELSE N'Tồn kho dồi dào'
    END AS TrangThaiTonKho
FROM ChiNhanh cn
INNER JOIN KhoHang k ON cn.MaCN = k.MaCN
INNER JOIN TonKho tk ON k.MaKho = tk.MaKho
INNER JOIN SanPham sp ON tk.MaSP = sp.MaSP
INNER JOIN DanhMuc dm ON sp.MaDM = dm.MaDM
WHERE sp.DaXoa = 0; -- Chỉ theo dõi sản phẩm còn đang kinh doanh
GO

PRINT N'✅ Đã tạo thành công VIEW 1: v_BaoCaoTonKhoTheoChiNhanh';
GO

-- =========================================================================
-- VIEW 2: DANH BẠ NHÂN VIÊN CÔNG KHAI & PHÂN CẤP QUẢN LÝ (BẢO MẬT CỘT LƯƠNG)
-- Nghiệp vụ: Cung cấp danh bạ nội bộ cho nhân viên thường, tra cứu người quản lý trực tiếp
-- Kỹ thuật: 
--   1. Column-level Security: Loại bỏ hoàn toàn cột 'Luong' khỏi View
--   2. Self LEFT JOIN: Nối bảng NhanVien với chính nó để giải mã cây nhân sự (MaQL -> HoTen)
--   3. Xử lý NULL: Dùng ISNULL hiển thị '(Ban Giám Đốc)' cho vị trí lãnh đạo cao nhất
--   4. Soft Delete: Lọc bỏ nhân viên đã nghỉ việc (DaXoa = 0)
-- =========================================================================
IF OBJECT_ID('v_NhanVien_CongKhai', 'V') IS NOT NULL 
    DROP VIEW v_NhanVien_CongKhai;
GO

CREATE VIEW v_NhanVien_CongKhai
AS
SELECT 
    nv.MaNV,
    nv.HoTen AS TenNhanVien,
    cn.MaCN,
    cn.TenCN AS ChiNhanhLamViec,
    cn.DiaChi AS DiaChiChiNhanh,
    nv.MaQL,
    ISNULL(ql.HoTen, N'(Ban Giám Đốc)') AS NguoiQuanLyTrucTiep
    -- LƯU Ý BẢO MẬT: TUYỆT ĐỐI KHÔNG SELECT CỘT 'Luong' Ở ĐÂY!
FROM NhanVien nv
INNER JOIN ChiNhanh cn ON nv.MaCN = cn.MaCN
LEFT JOIN NhanVien ql ON nv.MaQL = ql.MaNV
WHERE nv.DaXoa = 0; -- Không hiển thị nhân viên đã nghỉ việc
GO

PRINT N'✅ Đã tạo thành công VIEW 2: v_NhanVien_CongKhai';
GO
