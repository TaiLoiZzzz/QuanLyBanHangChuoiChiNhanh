-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 7: XÂY DỰNG 5 THỦ TỤC LƯU TRỮ (STORED PROCEDURES) CÓ TRY...CATCH
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- XÓA THỦ TỤC NẾU ĐÃ TỒN TẠI ĐỂ TẠO LẠI KHÔNG BỊ TRÙNG
IF OBJECT_ID('dbo.sp_TaoDonHangVaChiTiet', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_TaoDonHangVaChiTiet;
IF OBJECT_ID('dbo.sp_CapNhatTrangThaiDonHang', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CapNhatTrangThaiDonHang;
IF OBJECT_ID('dbo.sp_ChuyenKhoNoiBo', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_ChuyenKhoNoiBo;
IF OBJECT_ID('dbo.sp_TimKiemSanPhamNangCao', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_TimKiemSanPhamNangCao;
IF OBJECT_ID('dbo.sp_BaoCaoTongHopDoanhThuChiNhanh', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_BaoCaoTongHopDoanhThuChiNhanh;
GO

-- =========================================================================
-- THỦ TỤC 1: TẠO ĐƠN HÀNG VÀ CHI TIẾT ĐƠN HÀNG NGUYÊN TỬ (INSERT)
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- Nghiệp vụ: Thu ngân tạo đơn hàng mới kèm sản phẩm đầu tiên trong 1 giao dịch
-- Kỹ thuật: TRY...CATCH, XACT_STATE(), OUTPUT parameter, Transaction an toàn
-- =========================================================================
CREATE PROCEDURE dbo.sp_TaoDonHangVaChiTiet
 @MaKH INT, @MaNV INT, @MaKhoXuat INT, @MaSP INT, @SoLuong INT, @DonGiaBan DECIMAL(12,2), @MaDH_Moi INT=NULL OUTPUT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  IF @SoLuong IS NULL OR @SoLuong<=0 OR @DonGiaBan IS NULL OR @DonGiaBan<=0
    THROW 51201,N'Số lượng và đơn giá phải dương.',1;
  DECLARE @Discount DECIMAL(5,4);
  SELECT @Discount=CASE LoaiKH WHEN 1 THEN 0.10 WHEN 2 THEN 0.15 ELSE 0 END FROM dbo.KhachHang WITH(HOLDLOCK) WHERE MaKH=@MaKH;
  IF @Discount IS NULL THROW 51202,N'Khách hàng không tồn tại.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WITH(HOLDLOCK) WHERE MaNV=@MaNV AND DaXoa=0)
    THROW 51203,N'Nhân viên không tồn tại hoặc đã nghỉ việc.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WITH(HOLDLOCK) WHERE MaSP=@MaSP AND DaXoa=0)
    THROW 51204,N'Sản phẩm không tồn tại hoặc đã ngừng bán.',1;
  DECLARE @Stock INT;
  SELECT @Stock=SoLuongTon FROM dbo.TonKho WITH(UPDLOCK,HOLDLOCK) WHERE MaKho=@MaKhoXuat AND MaSP=@MaSP;
  IF @Stock IS NULL OR @Stock<@SoLuong THROW 51205,N'Kho không đủ số lượng tồn.',1;
  INSERT dbo.DonHang(MaKH,MaNV,MaKhoXuat,TiLeChietKhau,TiLeVAT)
  VALUES(@MaKH,@MaNV,@MaKhoXuat,@Discount,0.08);
  SET @MaDH_Moi=SCOPE_IDENTITY();
  INSERT dbo.ChiTietDonHang(MaDH,MaSP,SoLuong,DonGiaBan) VALUES(@MaDH_Moi,@MaSP,@SoLuong,@DonGiaBan);
  COMMIT; SELECT @MaDH_Moi AS MaDH; RETURN 0;
 END TRY
 BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
PRINT N'Da tao thanh cong PROCEDURE 1: dbo.sp_TaoDonHangVaChiTiet';
GO

-- =========================================================================
-- THỦ TỤC 2: CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG CÓ KIỂM SOÁT VÒNG ĐỜI (UPDATE)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Nghiệp vụ: Chuyển trạng thái đơn (0: Mới -> 1: Xác nhận -> 2: Đang giao -> 3: Giao thành công / 4: Hủy)
-- Kỹ thuật: Kiểm tra luật chuyển đổi trạng thái hợp lệ, TRY...CATCH
-- =========================================================================
CREATE PROCEDURE dbo.sp_CapNhatTrangThaiDonHang @MaDH INT,@TrangThaiMoi TINYINT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  IF NOT EXISTS(SELECT 1 FROM dbo.DonHang WITH(UPDLOCK,HOLDLOCK) WHERE MaDH=@MaDH)
    THROW 50404,N'Đơn hàng không tồn tại.',1;
  IF @TrangThaiMoi IS NULL OR @TrangThaiMoi NOT IN(0,1,2,3,4) THROW 51206,N'Trạng thái không hợp lệ.',1;
  UPDATE dbo.DonHang SET TrangThai=@TrangThaiMoi WHERE MaDH=@MaDH;
  COMMIT; SELECT N'Cập nhật trạng thái đơn hàng thành công!' AS ThongBao,@MaDH AS MaDH,@TrangThaiMoi AS TrangThaiMoi;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
PRINT N'Da tao thanh cong PROCEDURE 2: dbo.sp_CapNhatTrangThaiDonHang';
GO

-- =========================================================================
-- THỦ TỤC 3: ĐIỀU CHUYỂN HÀNG HÓA NỘI BỘ GIỮA 2 KHO (TRANSACTION NGUYÊN TỬ)
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
-- Nghiệp vụ: Chuyển N sản phẩm từ Kho A sang Kho B của chuỗi
-- Kỹ thuật: UPDLOCK trên kho xuất để chống Race Condition, Transaction kiểm soát ACID
-- =========================================================================
CREATE PROCEDURE dbo.sp_ChuyenKhoNoiBo @MaKhoXuat INT,@MaKhoNhap INT,@MaSP INT,@SoLuongChuyen INT,@MaNVThucHien INT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE MaNV=@MaNVThucHien AND DaXoa=0)
    THROW 51218,N'Nhân viên thực hiện không hợp lệ.',1;
  -- Both transfer entry points acquire warehouse locks in the same ascending order.
  EXEC dbo.usp_Tx_ChuyenKhoHangHoaLienChiNhanh @MaKhoXuat,@MaKhoNhap,@MaSP,@SoLuongChuyen;
  INSERT dbo.NhatKyHeThong(HanhDong,NoiDung,NguoiThucHien)
    VALUES(N'CHUYEN_KHO_NOI_BO',CONCAT(N'NV ',@MaNVThucHien,N', Kho ',@MaKhoXuat,N' -> ',@MaKhoNhap,N', SP ',@MaSP,N', SL ',@SoLuongChuyen),SUSER_SNAME());
  COMMIT;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO

PRINT N'Da tao thanh cong PROCEDURE 3: dbo.sp_ChuyenKhoNoiBo';
GO

-- =========================================================================
-- THỦ TỤC 4: TÌM KIẾM SẢN PHẨM NÂNG CAO ĐA TIÊU CHÍ (SEARCH)
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
-- Nghiệp vụ: Tìm sản phẩm theo từ khóa tên, theo danh mục, hoặc theo khoảng giá
-- Kỹ thuật: Xử lý tham số linh hoạt (Dynamic filtering với COALESCE / IS NULL)
-- =========================================================================
CREATE PROCEDURE dbo.sp_TimKiemSanPhamNangCao
    @TuKhoa NVARCHAR(150) = NULL,
    @MaDM INT = NULL,
    @GiaMin DECIMAL(12,2) = NULL,
    @GiaMax DECIMAL(12,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT 
            sp.MaSP,
            sp.TenSP,
            dm.MaDM,
            dm.TenDM,
            sp.GiaBanHienTai,
            sp.DonViTinh,
            ISNULL(SUM(tk.SoLuongTon), 0) AS TongTonKhoToanHeThong
        FROM SanPham sp
        INNER JOIN DanhMuc dm ON sp.MaDM = dm.MaDM
        LEFT JOIN TonKho tk ON sp.MaSP = tk.MaSP
        WHERE sp.DaXoa = 0
          AND (@TuKhoa IS NULL OR sp.TenSP LIKE N'%' + @TuKhoa + N'%')
          AND (@MaDM IS NULL OR sp.MaDM = @MaDM)
          AND (@GiaMin IS NULL OR sp.GiaBanHienTai >= @GiaMin)
          AND (@GiaMax IS NULL OR sp.GiaBanHienTai <= @GiaMax)
        GROUP BY sp.MaSP, sp.TenSP, dm.MaDM, dm.TenDM, sp.GiaBanHienTai, sp.DonViTinh
        ORDER BY sp.GiaBanHienTai ASC;
        RETURN 0;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN 1;
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong PROCEDURE 4: dbo.sp_TimKiemSanPhamNangCao';
GO

-- =========================================================================
-- THỦ TỤC 5: BÁO CÁO TỔNG HỢP DOANH THU & SẢN LƯỢNG CHI NHÁNH (REPORT / STATS)
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
-- Nghiệp vụ: Ban Giám Đốc xem doanh thu, số đơn và sản lượng bán theo chi nhánh
-- Kỹ thuật: Phân tích nhóm ROLLUP / Aggregation, TRY...CATCH
-- =========================================================================
CREATE PROCEDURE dbo.sp_BaoCaoTongHopDoanhThuChiNhanh
    @Nam INT,
    @Thang INT = NULL -- Nếu NULL thì tính cả năm
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT 
            cn.MaCN,
            cn.TenCN,
            COUNT(DISTINCT dh.MaDH) AS TongSoDonHang,
            ISNULL(SUM(ct.SoLuong), 0) AS TongSoLuongSanPhamBan,
            ISNULL(SUM(ROUND(ct.ThanhTien*(1-dh.TiLeChietKhau),0)), 0) AS DoanhThuBanHang,
            ISNULL(SUM(ROUND(ct.ThanhTien*(1-dh.TiLeChietKhau)*dh.TiLeVAT,0)), 0) AS TienThueVATThuDuoc,
            ISNULL(SUM(ROUND(ct.ThanhTien*(1-dh.TiLeChietKhau),0)+ROUND(ct.ThanhTien*(1-dh.TiLeChietKhau)*dh.TiLeVAT,0)), 0) AS TongThuThucTe
        FROM ChiNhanh cn
        LEFT JOIN KhoHang k ON cn.MaCN = k.MaCN
        LEFT JOIN DonHang dh ON k.MaKho = dh.MaKhoXuat 
                             AND dh.TrangThai = 3 -- Chỉ tính đơn thành công
                             AND YEAR(dh.NgayDat) = @Nam
                             AND (@Thang IS NULL OR MONTH(dh.NgayDat) = @Thang)
        LEFT JOIN ChiTietDonHang ct ON dh.MaDH = ct.MaDH
        GROUP BY cn.MaCN, cn.TenCN
        ORDER BY DoanhThuBanHang DESC;
        RETURN 0;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN 1;
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong PROCEDURE 5: dbo.sp_BaoCaoTongHopDoanhThuChiNhanh';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 STORED PROCEDURES CO TRY...CATCH CHUAN CUA CO THE!';
PRINT N'=========================================================================';
GO

-- Application writes use ownership chaining; roles do not need direct table UPDATE.
CREATE OR ALTER PROCEDURE dbo.usp_LuuSanPham
 @MaSP INT=NULL OUTPUT,@TenSP NVARCHAR(150),@MaDM INT,@GiaBanHienTai DECIMAL(12,2),@DonViTinh NVARCHAR(20)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  IF NULLIF(LTRIM(RTRIM(@TenSP)),N'') IS NULL OR NULLIF(LTRIM(RTRIM(@DonViTinh)),N'') IS NULL OR @GiaBanHienTai<=0
   THROW 51210,N'Thông tin sản phẩm không hợp lệ.',1;
  IF @MaSP IS NULL
  BEGIN
   INSERT dbo.SanPham(TenSP,MaDM,GiaBanHienTai,DonViTinh) VALUES(@TenSP,@MaDM,@GiaBanHienTai,@DonViTinh);
   SET @MaSP=SCOPE_IDENTITY();
   INSERT dbo.TonKho(MaKho,MaSP,SoLuongTon) SELECT MaKho,@MaSP,0 FROM dbo.KhoHang;
  END
  ELSE
  BEGIN
   UPDATE dbo.SanPham SET TenSP=@TenSP,MaDM=@MaDM,GiaBanHienTai=@GiaBanHienTai,DonViTinh=@DonViTinh WHERE MaSP=@MaSP AND DaXoa=0;
   IF @@ROWCOUNT=0 THROW 50404,N'Sản phẩm không tồn tại.',1;
  END;
  COMMIT;
  SELECT @MaSP AS MaSP,@TenSP AS TenSP,@MaDM AS MaDM,@GiaBanHienTai AS GiaBanHienTai,@DonViTinh AS DonViTinh;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_XoaMemSanPham @MaSP INT AS
BEGIN
 SET NOCOUNT ON;
 UPDATE dbo.SanPham SET DaXoa=1 WHERE MaSP=@MaSP AND DaXoa=0;
 IF @@ROWCOUNT=0 THROW 50404,N'Sản phẩm không tồn tại.',1;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ThemChiNhanh @TenCN NVARCHAR(100),@DiaChi NVARCHAR(200)=NULL,@SoDT CHAR(10) AS
BEGIN
 SET NOCOUNT ON;
 IF NULLIF(LTRIM(RTRIM(@TenCN)),N'') IS NULL OR @SoDT LIKE '%[^0-9]%' OR LEN(@SoDT)<>10
  THROW 51211,N'Thông tin chi nhánh không hợp lệ.',1;
 INSERT dbo.ChiNhanh(TenCN,DiaChi,SoDT) VALUES(@TenCN,@DiaChi,@SoDT);
 SELECT CONVERT(INT,SCOPE_IDENTITY()) AS MaCN,@TenCN AS TenCN,@DiaChi AS DiaChi,@SoDT AS SoDT;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ThemNhanVien @HoTen NVARCHAR(100),@Luong DECIMAL(12,2),@MaCN INT,@MaQL INT=NULL AS
BEGIN
 SET NOCOUNT ON;
 IF NULLIF(LTRIM(RTRIM(@HoTen)),N'') IS NULL OR @Luong<=0 THROW 51212,N'Thông tin nhân viên không hợp lệ.',1;
 IF @MaQL IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE MaNV=@MaQL AND DaXoa=0)
  THROW 51213,N'Quản lý không còn làm việc.',1;
 INSERT dbo.NhanVien(HoTen,Luong,MaCN,MaQL) VALUES(@HoTen,@Luong,@MaCN,@MaQL);
 SELECT CONVERT(INT,SCOPE_IDENTITY()) AS MaNV,@HoTen AS HoTen,@MaCN AS MaCN,@MaQL AS MaQL;
END;
GO
-- Stock receipts are explicit, audited transactions; transfers never manufacture inventory.
CREATE OR ALTER PROCEDURE dbo.usp_NhapKho @MaKho INT,@MaSP INT,@SoLuong INT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  IF @SoLuong IS NULL OR @SoLuong<=0 THROW 51214,N'Số lượng nhập phải dương.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WITH(HOLDLOCK) WHERE MaSP=@MaSP AND DaXoa=0) THROW 51215,N'Sản phẩm không còn kinh doanh.',1;
  IF EXISTS(SELECT 1 FROM dbo.TonKho WITH(UPDLOCK,HOLDLOCK) WHERE MaKho=@MaKho AND MaSP=@MaSP)
   UPDATE dbo.TonKho SET SoLuongTon=SoLuongTon+@SoLuong WHERE MaKho=@MaKho AND MaSP=@MaSP;
  ELSE INSERT dbo.TonKho(MaKho,MaSP,SoLuongTon) VALUES(@MaKho,@MaSP,@SoLuong);
  INSERT dbo.NhatKyHeThong(HanhDong,NoiDung,NguoiThucHien) VALUES(N'NHAP_KHO',CONCAT(N'Kho ',@MaKho,N', SP ',@MaSP,N', SL ',@SoLuong),SUSER_SNAME());
  COMMIT; SELECT @MaKho AS MaKho,@MaSP AS MaSP,@SoLuong AS SoLuongNhap;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_ThemKhachHang
 @HoTen NVARCHAR(100),@SoDT CHAR(10),@LoaiKH TINYINT=0,@DiemTichLuy INT=0 AS
BEGIN
 SET NOCOUNT ON;
 IF NULLIF(LTRIM(RTRIM(@HoTen)),N'') IS NULL OR @DiemTichLuy<0 OR @LoaiKH NOT IN(0,1,2)
   OR LEN(@SoDT)<>10 OR @SoDT LIKE '%[^0-9]%' THROW 51216,N'Thông tin khách hàng không hợp lệ.',1;
 IF IS_MEMBER('Role_ThuNgan')=1 AND (@LoaiKH<>0 OR @DiemTichLuy<>0)
   THROW 51217,N'Thu ngân chỉ được tạo khách thường với điểm ban đầu bằng 0.',1;
 INSERT dbo.KhachHang(HoTen,SoDT,LoaiKH,DiemTichLuy) VALUES(@HoTen,@SoDT,@LoaiKH,@DiemTichLuy);
 SELECT CONVERT(INT,SCOPE_IDENTITY()) AS MaKH,@HoTen AS HoTen,@SoDT AS SoDT,@LoaiKH AS LoaiKH,@DiemTichLuy AS DiemTichLuy;
END;
GO
