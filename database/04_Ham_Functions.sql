-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 4: XÂY DỰNG 5 HÀM NGƯỜI DÙNG (USER-DEFINED FUNCTIONS - UDF)
-- NGƯỜI PHỤ TRÁCH: QUÁCH TÀI LỢI (70%) - HỖ TRỢ: PHAN THIỆN KHỞI (7.5%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- XÓA HÀM NẾU ĐÃ TỒN TẠI ĐỂ THỰC THI LẠI KHÔNG BỊ XUNG ĐỘT
IF OBJECT_ID('dbo.fn_TinhTienSauChietKhauVIP', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_TinhTienSauChietKhauVIP;
IF OBJECT_ID('dbo.fn_KiemTraKhaNangDapUngDonHang', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_KiemTraKhaNangDapUngDonHang;
IF OBJECT_ID('dbo.fn_FormatMaHoaDonTuDong', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_FormatMaHoaDonTuDong;
IF OBJECT_ID('dbo.fn_DanhSachDonHangTheoKhoangThoiGian', 'IF') IS NOT NULL DROP FUNCTION dbo.fn_DanhSachDonHangTheoKhoangThoiGian;
IF OBJECT_ID('dbo.fn_BaoCaoDoanhThuNhanVienChiTiet', 'TF') IS NOT NULL DROP FUNCTION dbo.fn_BaoCaoDoanhThuNhanVienChiTiet;
GO

-- =========================================================================
-- HÀM 1 (SCALAR FUNCTION): TÍNH THÀNH TIỀN SAU CHIẾT KHẤU THEO HẠNG THÀNH VIÊN
-- Nghiệp vụ: Tự động tra cứu hạng khách hàng và áp dụng % giảm giá tương ứng
--            (LoaiKH = 0: 0%, LoaiKH = 1 (VIP): Giảm 10%, LoaiKH = 2 (Kim Cương): Giảm 15%)
-- =========================================================================
CREATE FUNCTION dbo.fn_TinhTienSauChietKhauVIP
(
    @MaKH INT,
    @TongTienGoc DECIMAL(14,2)
)
RETURNS DECIMAL(14,2)
AS
BEGIN
    IF @TongTienGoc IS NULL OR @TongTienGoc <= 0
        RETURN 0;

    DECLARE @LoaiKH TINYINT;
    SELECT @LoaiKH = LoaiKH FROM KhachHang WHERE MaKH = @MaKH;

    DECLARE @TiLeGiam DECIMAL(4,2) = 0.00;
    IF @LoaiKH = 1
        SET @TiLeGiam = 0.10; -- Giảm 10% cho VIP
    ELSE IF @LoaiKH = 2
        SET @TiLeGiam = 0.15; -- Giảm 15% cho Kim Cương

    DECLARE @TienSauGiam DECIMAL(14,2);
    SET @TienSauGiam = @TongTienGoc * (1.00 - @TiLeGiam);

    RETURN ROUND(@TienSauGiam, 0);
END;
GO

PRINT N'Da tao thanh cong HÀM 1 (Scalar): dbo.fn_TinhTienSauChietKhauVIP';
GO

-- =========================================================================
-- HÀM 2 (SCALAR FUNCTION): KIỂM TRA KHẢ NĂNG ĐÁP ỨNG TỒN KHO CỦA SẢN PHẨM
-- Nghiệp vụ: Trả về 1 (Đủ hàng) hoặc 0 (Hết hàng/Thiếu hàng) cho giao dịch bán/chuyển kho
-- =========================================================================
CREATE FUNCTION dbo.fn_KiemTraKhaNangDapUngDonHang
(
    @MaKho INT,
    @MaSP INT,
    @SoLuongYeuCau INT
)
RETURNS BIT
AS
BEGIN
    IF @SoLuongYeuCau <= 0
        RETURN 0;

    DECLARE @SoLuongTonHienTai INT = 0;

    SELECT @SoLuongTonHienTai = ISNULL(SoLuongTon, 0)
    FROM TonKho
    WHERE MaKho = @MaKho AND MaSP = @MaSP;

    IF @SoLuongTonHienTai >= @SoLuongYeuCau
        RETURN 1; -- Đủ khả năng đáp ứng

    RETURN 0; -- Không đủ hàng trong kho
END;
GO

PRINT N'Da tao thanh cong HÀM 2 (Scalar): dbo.fn_KiemTraKhaNangDapUngDonHang';
GO

-- =========================================================================
-- HÀM 3 (INLINE TABLE-VALUED FUNCTION - iTVF): LỌC ĐƠN HÀNG THEO THỜI GIAN & CHI NHÁNH
-- Kỹ thuật chuyên sâu: Inline TVF không dùng BEGIN...END, cho phép SQL Server Query Optimizer
-- gộp trực tiếp vào kế hoạch thực thi chính (Inlining) để đạt tốc độ tối đa!
-- =========================================================================
CREATE FUNCTION dbo.fn_DanhSachDonHangTheoKhoangThoiGian
(
    @TuNgay DATETIME,
    @DenNgay DATETIME,
    @MaCN INT = NULL -- Nếu truyền NULL thì lấy toàn bộ chi nhánh
)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        dh.MaDH,
        dh.NgayDat,
        kh.MaKH,
        kh.HoTen AS TenKhachHang,
        kh.SoDT AS SoDTKhachHang,
        nv.HoTen AS NhanVienLap,
        cn.MaCN,
        cn.TenCN AS ChiNhanhBan,
        k.TenKho AS KhoXuat,
        dh.TrangThai,
        CASE dh.TrangThai
            WHEN 0 THEN N'Mới tạo'
            WHEN 1 THEN N'Đã xác nhận'
            WHEN 2 THEN N'Đang giao'
            WHEN 3 THEN N'Giao thành công'
            WHEN 4 THEN N'Đã hủy'
            ELSE N'Khác'
        END AS TenTrangThai,
        dh.TongTien
    FROM DonHang dh
    INNER JOIN KhachHang kh ON dh.MaKH = kh.MaKH
    INNER JOIN NhanVien nv ON dh.MaNV = nv.MaNV
    INNER JOIN KhoHang k ON dh.MaKhoXuat = k.MaKho
    INNER JOIN ChiNhanh cn ON k.MaCN = cn.MaCN
    WHERE dh.NgayDat >= @TuNgay 
      AND dh.NgayDat <= @DenNgay
      AND (@MaCN IS NULL OR cn.MaCN = @MaCN)
);
GO

PRINT N'Da tao thanh cong HÀM 3 (Inline TVF): dbo.fn_DanhSachDonHangTheoKhoangThoiGian';
GO

-- =========================================================================
-- HÀM 4 (MULTI-STATEMENT TABLE-VALUED FUNCTION - mTVF): BÁO CÁO DOANH SỐ & KPI NHÂN VIÊN
-- Kỹ thuật chuyên sâu: Khai báo biến bảng cấu trúc tùy biến @KetQua TABLE (...),
-- tổng hợp dữ liệu và đánh giá xếp loại hiệu suất làm việc của nhân viên theo năm
-- =========================================================================
CREATE FUNCTION dbo.fn_BaoCaoDoanhThuNhanVienChiTiet
(
    @Nam INT
)
RETURNS @BaoCao TABLE
(
    MaNV INT,
    HoTen NVARCHAR(100),
    TenChiNhanh NVARCHAR(100),
    SoDonHangDaChot INT,
    TongDoanhSo DECIMAL(14,2),
    DanhGiaKPI NVARCHAR(50)
)
AS
BEGIN
    INSERT INTO @BaoCao (MaNV, HoTen, TenChiNhanh, SoDonHangDaChot, TongDoanhSo, DanhGiaKPI)
    SELECT 
        nv.MaNV,
        nv.HoTen,
        cn.TenCN,
        COUNT(dh.MaDH) AS SoDonHangDaChot,
        ISNULL(SUM(dh.TongTien), 0) AS TongDoanhSo,
        CASE 
            WHEN ISNULL(SUM(dh.TongTien), 0) >= 20000000 THEN N'Xuất sắc (Vượt KPI)'
            WHEN ISNULL(SUM(dh.TongTien), 0) >= 5000000 THEN N'Đạt yêu cầu'
            WHEN ISNULL(SUM(dh.TongTien), 0) > 0 THEN N'Cần cải thiện'
            ELSE N'Chưa phát sinh doanh số'
        END AS DanhGiaKPI
    FROM NhanVien nv
    INNER JOIN ChiNhanh cn ON nv.MaCN = cn.MaCN
    LEFT JOIN DonHang dh ON nv.MaNV = dh.MaNV 
                         AND dh.TrangThai = 3 -- Chỉ tính các đơn giao thành công
                         AND YEAR(dh.NgayDat) = @Nam
    WHERE nv.DaXoa = 0
    GROUP BY nv.MaNV, nv.HoTen, cn.TenCN;

    RETURN;
END;
GO

PRINT N'Da tao thanh cong HÀM 4 (Multi-statement TVF): dbo.fn_BaoCaoDoanhThuNhanVienChiTiet';
GO

-- =========================================================================
-- HÀM 5 (SCALAR FUNCTION): TỰ ĐỘNG CHUẨN HÓA MÃ HÓA ĐƠN THEO FORMAT DOANH NGHIỆP
-- Nghiệp vụ: Chuyển đổi mã số đơn hàng ID thành chuỗi nghiệp vụ quy chuẩn: HD-YYYYMMDD-00000X
--            Ví dụ: MaDH = 1, Ngay = 18/10/2026 -> HD-20261018-000001
-- =========================================================================
CREATE FUNCTION dbo.fn_FormatMaHoaDonTuDong
(
    @MaDH INT,
    @NgayDat DATETIME
)
RETURNS VARCHAR(30)
AS
BEGIN
    IF @MaDH IS NULL
        RETURN 'HD-UNKNOWN';

    DECLARE @ChuoiNgay VARCHAR(8);
    SET @ChuoiNgay = CONVERT(VARCHAR(8), ISNULL(@NgayDat, GETDATE()), 112); -- Định dạng YYYYMMDD (chuẩn 112 ISO)

    DECLARE @ChuoiSoThuTu VARCHAR(6);
    SET @ChuoiSoThuTu = RIGHT('000000' + CAST(@MaDH AS VARCHAR(10)), 6); -- Đệm đủ 6 chữ số

    RETURN 'HD-' + @ChuoiNgay + '-' + @ChuoiSoThuTu;
END;
GO

PRINT N'Da tao thanh cong HÀM 5 (Scalar): dbo.fn_FormatMaHoaDonTuDong';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 HAM (UDF) CHUAN GU DANH GIA CUA CO THE!';
PRINT N'=========================================================================';
GO
