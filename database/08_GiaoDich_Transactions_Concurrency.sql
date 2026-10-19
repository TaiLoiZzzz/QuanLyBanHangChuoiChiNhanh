-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 8: 5 NGHIỆP VỤ GIAO DỊCH (ACID) & MINH CHỨNG XỬ LÝ TRANH CHẤP ĐỒNG THỜI
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
-- GIAO DỊCH 1: ĐẶT HÀNG & GIỮ CHỖ TỒN KHO AN TOÀN (ATOMIC ORDERING)
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- Đảm bảo tính nguyên tử: Tạo đơn hàng + Chi tiết đơn hàng + Trừ kho + Cập nhật tổng tiền
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_DatHangVaGiuCho
    @MaKH INT,
    @MaNV INT,
    @MaKhoXuat INT,
    @MaSP INT,
    @SoLuong INT,
    @DonGiaBan DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Khóa dòng dữ liệu tồn kho bằng UPDLOCK + HOLDLOCK chống Lost Update
        DECLARE @TonHienTai INT;
        SELECT @TonHienTai = SoLuongTon
        FROM TonKho WITH (UPDLOCK, HOLDLOCK)
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        IF @TonHienTai IS NULL OR @TonHienTai < @SoLuong
            THROW 51001, N'Giao dịch thất bại: Hàng trong kho không đủ để giữ chỗ!', 1;

        -- Tạo Header đơn hàng với Tổng tiền tính toán trực tiếp
        DECLARE @TongTien DECIMAL(14,2) = @SoLuong * @DonGiaBan;

        INSERT INTO DonHang (MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien)
        VALUES (@MaKH, @MaNV, @MaKhoXuat, GETDATE(), 0, @TongTien);

        DECLARE @NewMaDH INT = SCOPE_IDENTITY();

        -- Tạo Chi tiết đơn hàng (Trigger 1 sẽ tự xử lý đồng bộ)
        INSERT INTO ChiTietDonHang (MaDH, MaSP, SoLuong, DonGiaBan)
        VALUES (@NewMaDH, @MaSP, @SoLuong, @DonGiaBan);

        COMMIT TRANSACTION;
        SELECT N'Đặt hàng và giữ chỗ kho thành công!' AS KetQua, @NewMaDH AS MaDH;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 1: usp_Tx_DatHangVaGiuCho';
GO

-- =========================================================================
-- GIAO DỊCH 2: HỦY ĐƠN HÀNG VÀ HOÀN TRẢ SỐ LƯỢNG TỒN KHO (COMPENSATING TX)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Nghiệp vụ: Chuyển trạng thái đơn sang 4 (Đã hủy) và hoàn trả lại số lượng cho toàn bộ mặt hàng
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_HuyDonHangVaHoanTonKho
    @MaDH INT,
    @LyDoHuy NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @TrangThaiHienTai TINYINT, @MaKho INT;
        SELECT @TrangThaiHienTai = TrangThai, @MaKho = MaKhoXuat 
        FROM DonHang WITH (UPDLOCK, ROWLOCK)
        WHERE MaDH = @MaDH;

        IF @TrangThaiHienTai IS NULL
            THROW 51002, N'Đơn hàng không tồn tại!', 1;

        IF @TrangThaiHienTai = 3
            THROW 51003, N'Không thể hủy đơn hàng đã giao thành công!', 1;

        IF @TrangThaiHienTai = 4
            THROW 51004, N'Đơn hàng này đã được hủy trước đó!', 1;

        -- Hoàn trả lại số lượng tồn kho chính xác theo từng sản phẩm (Group by tránh trùng lặp)
        UPDATE tk
        SET tk.SoLuongTon = tk.SoLuongTon + del.TongSoLuongHoan
        FROM TonKho tk
        INNER JOIN (
            SELECT ct.MaSP, SUM(ct.SoLuong) AS TongSoLuongHoan
            FROM ChiTietDonHang ct
            WHERE ct.MaDH = @MaDH
            GROUP BY ct.MaSP
        ) del ON tk.MaSP = del.MaSP AND tk.MaKho = @MaKho;

        -- Cập nhật trạng thái đơn hàng sang 4 (Đã hủy)
        UPDATE DonHang
        SET TrangThai = 4
        WHERE MaDH = @MaDH;

        -- Ghi log hủy đơn vào hệ thống
        INSERT INTO NhatKyHeThong (HanhDong, NoiDung, ThoiGian, NguoiThucHien)
        VALUES (N'HUY_DON_HANG', N'Hủy đơn ' + CAST(@MaDH AS NVARCHAR(10)) + N'. Lý do: ' + @LyDoHuy, GETDATE(), SUSER_SNAME());

        COMMIT TRANSACTION;
        SELECT N'Hủy đơn hàng và hoàn tồn kho thành công!' AS KetQua, @MaDH AS MaDH;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 2: usp_Tx_HuyDonHangVaHoanTonKho';
GO

-- =========================================================================
-- GIAO DỊCH 3: SA THẢI QUẢN LÝ VÀ ĐIỀU CHUYỂN TOÀN BỘ CẤP DƯỚI (HR REORGANIZATION)
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
-- Nghiệp vụ: Xóa mềm quản lý (DaXoa = 1) và chuyển các nhân viên dưới quyền lên cho Sếp Tổng
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_XoaNhanVienVaDieuChuyenQuanLy
    @MaNVCantXoa INT,
    @MaQLThayThe INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM NhanVien WHERE MaNV = @MaNVCantXoa AND DaXoa = 0)
            THROW 51005, N'Nhân viên cần xóa không tồn tại hoặc đã nghỉ việc!', 1;

        IF NOT EXISTS (SELECT 1 FROM NhanVien WHERE MaNV = @MaQLThayThe AND DaXoa = 0)
            THROW 51006, N'Quản lý thay thế không hợp lệ!', 1;

        -- 1. Điều chuyển toàn bộ nhân viên cấp dưới sang quản lý mới
        UPDATE NhanVien
        SET MaQL = @MaQLThayThe
        WHERE MaQL = @MaNVCantXoa AND DaXoa = 0;

        -- 2. Đánh dấu xóa mềm nhân viên
        UPDATE NhanVien
        SET DaXoa = 1
        WHERE MaNV = @MaNVCantXoa;

        COMMIT TRANSACTION;
        SELECT N'Điều chuyển nhân sự và xóa mềm thành công!' AS KetQua;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 3: usp_Tx_XoaNhanVienVaDieuChuyenQuanLy';
GO

-- =========================================================================
-- GIAO DỊCH 4: THĂNG HẠNG THÀNH VIÊN VÀ TẶNG ĐIỂM THƯỞNG HÀNG LOẠT (BATCH PROMOTION)
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
-- Nghiệp vụ: Chạy định kỳ thăng hạng khách hàng có điểm tích lũy cao và tặng điểm tri ân
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_ThangHangThanhVienHangLoat
    @DiemToiThieu INT,
    @DiemThuongBonus INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Thăng hạng Kim Cương cho khách hàng đủ điểm
        UPDATE KhachHang
        SET 
            LoaiKH = 2,
            DiemTichLuy = DiemTichLuy + @DiemThuongBonus
        WHERE DiemTichLuy >= @DiemToiThieu AND LoaiKH < 2;

        DECLARE @SoLuongKhach INT = @@ROWCOUNT;

        INSERT INTO NhatKyHeThong (HanhDong, NoiDung, ThoiGian, NguoiThucHien)
        VALUES (
            N'THANG_HANG_KHACH_HANG',
            N'Đã nâng hạng thành công cho ' + CAST(@SoLuongKhach AS NVARCHAR(10)) + N' khách hàng VIP lên Kim Cương.',
            GETDATE(),
            SUSER_SNAME()
        );

        COMMIT TRANSACTION;
        SELECT N'Thăng hạng khách hàng thành công!' AS KetQua, @SoLuongKhach AS SoKhachDuocThangHang;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 4: usp_Tx_ThangHangThanhVienHangLoat';
GO

-- =========================================================================
-- GIAO DỊCH 5: ĐIỀU CHUYỂN KHO TỒN HÀNG HÓA LIÊN CHI NHÁNH CÓ BẢO MẬT (INTER-BRANCH TX)
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_ChuyenKhoHangHoaLienChiNhanh
    @MaKhoXuat INT,
    @MaKhoNhap INT,
    @MaSP INT,
    @SoLuong INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

        IF @SoLuong <= 0
            THROW 51005, N'Số lượng điều chuyển phải lớn hơn 0!', 1;

        IF @MaKhoXuat = @MaKhoNhap
            THROW 51006, N'Kho xuất và kho nhập không được trùng nhau!', 1;

        -- TRIỆT TIÊU HOÀN TOÀN DEADLOCK BẰNG KỸ THUẬT LOCK ORDERING (MIN TRƯỚC, MAX SAU)
        -- Ngăn chặn Wait-For Graph khép kín khi 2 phiên cùng chuyển hàng chéo chiều nhau giữa 2 kho
        DECLARE @KhoNho INT = CASE WHEN @MaKhoXuat < @MaKhoNhap THEN @MaKhoXuat ELSE @MaKhoNhap END;
        DECLARE @KhoLon INT = CASE WHEN @MaKhoXuat < @MaKhoNhap THEN @MaKhoNhap ELSE @MaKhoXuat END;

        -- Khóa trước kho có mã nhỏ hơn, sau đó khóa kho có mã lớn hơn
        DECLARE @DummyLock INT;
        SELECT @DummyLock = SoLuongTon FROM TonKho WITH (UPDLOCK, HOLDLOCK) WHERE MaKho = @KhoNho AND MaSP = @MaSP;
        SELECT @DummyLock = SoLuongTon FROM TonKho WITH (UPDLOCK, HOLDLOCK) WHERE MaKho = @KhoLon AND MaSP = @MaSP;

        -- Kiểm tra tồn kho thực tế tại kho nguồn xuất hàng
        DECLARE @TonKhoXuat INT;
        SELECT @TonKhoXuat = SoLuongTon 
        FROM TonKho WITH (UPDLOCK, HOLDLOCK)
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        IF @TonKhoXuat IS NULL OR @TonKhoXuat < @SoLuong
            THROW 51007, N'Kho nguồn không đủ số lượng để thực hiện điều chuyển!', 1;

        -- Trừ hàng kho xuất
        UPDATE TonKho 
        SET SoLuongTon = SoLuongTon - @SoLuong 
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        -- Cộng hàng kho nhập
        IF EXISTS (SELECT 1 FROM TonKho WHERE MaKho = @MaKhoNhap AND MaSP = @MaSP)
        BEGIN
            UPDATE TonKho 
            SET SoLuongTon = SoLuongTon + @SoLuong 
            WHERE MaKho = @MaKhoNhap AND MaSP = @MaSP;
        END
        ELSE
        BEGIN
            INSERT INTO TonKho (MaKho, MaSP, SoLuongTon) 
            VALUES (@MaKhoNhap, @MaSP, @SoLuong);
        END;

        COMMIT TRANSACTION;
        SELECT N'Điều chuyển kho thành công!' AS KetQua;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 5: usp_Tx_ChuyenKhoHangHoaLienChiNhanh';
GO

-- =========================================================================
-- PHẦN MINH CHỨNG TRANH CHẤP TRUY CẬP ĐỒNG THỜI (CONCURRENCY) & DEADLOCK
-- 1. GIẢI QUYẾT BÀI TOÁN LOST UPDATE (BÁN KHỐNG HÀNG TỒN KHO):
--    Nếu 2 người cùng đọc tồn kho = 1 và cùng trừ 1, cả 2 sẽ tưởng thành công -> Tồn kho thành -1!
--    Giải pháp: Dùng khóa "WITH (UPDLOCK, HOLDLOCK)" trong câu SELECT kiểm tra tồn kho.
--    UPDLOCK giữ khóa đọc có ý định cập nhật, chặn mọi phiên khác không được chen ngang.
--
-- 2. GIẢI QUYẾT BÀI TOÁN DEADLOCK:
--    Nguyên nhân: Phiên 1 khóa Bảng SanPham rồi xin khóa Bảng TonKho.
--                 Phiên 2 khóa Bảng TonKho rồi xin khóa Bảng SanPham.
--                 -> Hai bên chờ nhau vĩnh viễn gây Deadlock!
--    Giải pháp chuẩn mực:
--    - Quy ước Lock Ordering: Luôn truy cập bảng SanPham trước, bảng TonKho sau ở mọi thủ tục.
--    - Thiết lập: SET DEADLOCK_PRIORITY NORMAL / HIGH cho các giao dịch trọng yếu.
-- =========================================================================

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 GIAO DICH ACID VA MINH CHUNG CONCURRENCY / DEADLOCK!';
PRINT N'=========================================================================';
GO
