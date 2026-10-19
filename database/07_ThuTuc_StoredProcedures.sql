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
    @MaKH INT,
    @MaNV INT,
    @MaKhoXuat INT,
    @MaSP INT,
    @SoLuong INT,
    @DonGiaBan DECIMAL(12,2),
    @MaDH_Moi INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @SoLuong <= 0
            THROW 50004, N'Lỗi: Số lượng đặt hàng phải lớn hơn 0!', 1;

        IF @DonGiaBan <= 0
            THROW 50005, N'Lỗi: Đơn giá bán phải lớn hơn 0 VNĐ!', 1;

        -- 1. Kiểm tra tồn tại của Khách hàng, Nhân viên, Kho
        IF NOT EXISTS (SELECT 1 FROM KhachHang WHERE MaKH = @MaKH)
            THROW 50001, N'Lỗi: Khách hàng không tồn tại trong hệ thống!', 1;

        IF NOT EXISTS (SELECT 1 FROM NhanVien WHERE MaNV = @MaNV AND DaXoa = 0)
            THROW 50002, N'Lỗi: Nhân viên không hợp lệ hoặc đã nghỉ việc!', 1;

        IF NOT EXISTS (SELECT 1 FROM KhoHang WHERE MaKho = @MaKhoXuat)
            THROW 50003, N'Lỗi: Kho xuất hàng không tồn tại!', 1;

        -- 2. Khóa dòng dữ liệu tồn kho bằng UPDLOCK + HOLDLOCK chống Lost Update / Concurrency Race Condition
        -- Đảm bảo nếu kho còn 1 thì chỉ duy nhất 1 phiên được mua, phiên thứ 2 bắt buộc phải chờ
        DECLARE @TonKhoHienTai INT;
        SELECT @TonKhoHienTai = SoLuongTon
        FROM TonKho WITH (UPDLOCK, HOLDLOCK)
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        IF @TonKhoHienTai IS NULL OR @TonKhoHienTai < @SoLuong
            THROW 50006, N'Lỗi giao dịch: Không đủ số lượng tồn kho để đáp ứng đơn hàng!', 1;

        -- 3. Tạo đơn hàng mới với Tổng tiền tính toán trực tiếp (không để mặc định bằng 0)
        DECLARE @TongTienBanDau DECIMAL(14,2) = @SoLuong * @DonGiaBan;

        INSERT INTO DonHang (MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien)
        VALUES (@MaKH, @MaNV, @MaKhoXuat, GETDATE(), 0, @TongTienBanDau);

        SET @MaDH_Moi = SCOPE_IDENTITY();

        -- 4. Tạo chi tiết đơn hàng (Trigger 1 sẽ tự động kiểm tra và đồng bộ lại)
        INSERT INTO ChiTietDonHang (MaDH, MaSP, SoLuong, DonGiaBan)
        VALUES (@MaDH_Moi, @MaSP, @SoLuong, @DonGiaBan);

        COMMIT TRANSACTION;
        RETURN 0; -- Thành công mã lỗi 0
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
        RETURN 1; -- Thất bại mã lỗi 1
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
CREATE PROCEDURE dbo.sp_CapNhatTrangThaiDonHang
    @MaDH INT,
    @TrangThaiMoi TINYINT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM DonHang WHERE MaDH = @MaDH)
            THROW 50004, N'Lỗi: Đơn hàng không tồn tại!', 1;

        DECLARE @TrangThaiHienTai TINYINT;
        SELECT @TrangThaiHienTai = TrangThai FROM DonHang WHERE MaDH = @MaDH;

        -- Quy tắc vòng đời: Không được thay đổi đơn đã giao thành công (3) hoặc đã hủy (4)
        IF @TrangThaiHienTai = 3
            THROW 50005, N'Lỗi nghiệp vụ: Đơn hàng đã giao thành công, không thể thay đổi trạng thái!', 1;

        IF @TrangThaiHienTai = 4
            THROW 50006, N'Lỗi nghiệp vụ: Đơn hàng đã bị hủy, không thể kích hoạt lại!', 1;

        -- Cập nhật trạng thái mới (Trigger 3 sẽ tự động cộng điểm nếu chuyển sang 3)
        UPDATE DonHang
        SET TrangThai = @TrangThaiMoi
        WHERE MaDH = @MaDH;

        SELECT N'Cập nhật trạng thái đơn hàng thành công!' AS ThongBao, @MaDH AS MaDH, @TrangThaiMoi AS TrangThaiMoi;
        RETURN 0;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN 1;
    END CATCH;
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
CREATE PROCEDURE dbo.sp_ChuyenKhoNoiBo
    @MaKhoXuat INT,
    @MaKhoNhap INT,
    @MaSP INT,
    @SoLuongChuyen INT,
    @MaNVThucHien INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @MaKhoXuat = @MaKhoNhap
            THROW 50007, N'Lỗi: Kho xuất và Kho nhập không được trùng nhau!', 1;

        IF @SoLuongChuyen <= 0
            THROW 50008, N'Lỗi: Số lượng chuyển phải lớn hơn 0!', 1;

        BEGIN TRANSACTION;

        -- Khóa dòng dữ liệu tại kho xuất bằng UPDLOCK để tránh 2 giao dịch cùng trừ kho đồng thời
        DECLARE @TonKhoXuat INT;
        SELECT @TonKhoXuat = SoLuongTon
        FROM TonKho WITH (UPDLOCK, ROWLOCK)
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        IF @TonKhoXuat IS NULL OR @TonKhoXuat < @SoLuongChuyen
            THROW 50009, N'Lỗi: Kho xuất không đủ số lượng tồn để thực hiện điều chuyển!', 1;

        -- Trừ hàng tại kho xuất
        UPDATE TonKho
        SET SoLuongTon = SoLuongTon - @SoLuongChuyen
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        -- Cộng hàng tại kho nhập (nếu kho nhập chưa từng có món này thì INSERT, có rồi thì UPDATE)
        IF EXISTS (SELECT 1 FROM TonKho WHERE MaKho = @MaKhoNhap AND MaSP = @MaSP)
        BEGIN
            UPDATE TonKho
            SET SoLuongTon = SoLuongTon + @SoLuongChuyen
            WHERE MaKho = @MaKhoNhap AND MaSP = @MaSP;
        END
        ELSE
        BEGIN
            INSERT INTO TonKho (MaKho, MaSP, SoLuongTon)
            VALUES (@MaKhoNhap, @MaSP, @SoLuongChuyen);
        END;

        -- Ghi log hành động vào NhatKyHeThong
        INSERT INTO NhatKyHeThong (HanhDong, NoiDung, ThoiGian, NguoiThucHien)
        VALUES (
            N'CHUYEN_KHO_NOI_BO',
            N'Chuyển ' + CAST(@SoLuongChuyen AS NVARCHAR(10)) + N' món SP ' + CAST(@MaSP AS NVARCHAR(10)) + 
            N' từ Kho ' + CAST(@MaKhoXuat AS NVARCHAR(10)) + N' sang Kho ' + CAST(@MaKhoNhap AS NVARCHAR(10)),
            GETDATE(),
            N'NV_' + CAST(@MaNVThucHien AS NVARCHAR(10))
        );

        COMMIT TRANSACTION;

        SELECT N'Điều chuyển kho thành công!' AS ThongBao, @MaKhoXuat AS KhoXuat, @MaKhoNhap AS KhoNhap, @SoLuongChuyen AS SoLuong;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN 1;
    END CATCH;
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
            ISNULL(SUM(ct.ThanhTien), 0) AS DoanhThuBanHang,
            ISNULL(SUM(ct.ThanhTien * 0.08), 0) AS TienThueVATThuDuoc,
            ISNULL(SUM(ct.ThanhTien * 1.08), 0) AS TongThuThucTe
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
