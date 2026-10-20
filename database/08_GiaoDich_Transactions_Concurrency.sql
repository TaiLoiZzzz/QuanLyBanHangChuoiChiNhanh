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
 @MaKH INT,@MaNV INT,@MaKhoXuat INT,@MaSP INT,@SoLuong INT,@DonGiaBan DECIMAL(12,2) AS
BEGIN
 SET NOCOUNT ON;
 -- Reuse the same validated UPDLOCK + HOLDLOCK transaction as normal checkout.
 DECLARE @Id INT;
 EXEC dbo.sp_TaoDonHangVaChiTiet @MaKH,@MaNV,@MaKhoXuat,@MaSP,@SoLuong,@DonGiaBan,@Id OUTPUT;
END;
GO
PRINT N'Da tao thanh cong GIAO DICH 1: usp_Tx_DatHangVaGiuCho';
GO

-- =========================================================================
-- GIAO DỊCH 2: HỦY ĐƠN HÀNG VÀ HOÀN TRẢ SỐ LƯỢNG TỒN KHO (COMPENSATING TX)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Nghiệp vụ: Chuyển trạng thái đơn sang 4 (Đã hủy) và hoàn trả lại số lượng cho toàn bộ mặt hàng
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_HuyDonHangVaHoanTonKho @MaDH INT,@LyDoHuy NVARCHAR(200) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @State TINYINT;
  SELECT @State=TrangThai FROM dbo.DonHang WITH(UPDLOCK,HOLDLOCK) WHERE MaDH=@MaDH;
  IF @State IS NULL THROW 50404,N'Đơn hàng không tồn tại.',1;
  IF @State IN(3,4) THROW 51207,N'Đơn đã giao/hủy không thể hủy lại.',1;
  -- The order trigger is the single owner of stock refund, for both cancellation APIs.
  UPDATE dbo.DonHang SET TrangThai=4 WHERE MaDH=@MaDH;
  INSERT dbo.NhatKyHeThong(HanhDong,NoiDung,NguoiThucHien)
   VALUES(N'HUY_DON_HANG',CONCAT(N'Hủy đơn ',@MaDH,N': ',@LyDoHuy),SUSER_SNAME());
  COMMIT; SELECT N'Hủy đơn và hoàn kho thành công.' AS KetQua,@MaDH AS MaDH;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
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

        IF @MaNVCantXoa=@MaQLThayThe THROW 51208,N'Không thể tự thay thế chính mình.',1;
        DECLARE @Cycle BIT=0;
        ;WITH Descendants AS (
          SELECT MaNV FROM dbo.NhanVien WHERE MaQL=@MaNVCantXoa
          UNION ALL SELECT n.MaNV FROM dbo.NhanVien n JOIN Descendants d ON n.MaQL=d.MaNV
        ) SELECT @Cycle=1 FROM Descendants WHERE MaNV=@MaQLThayThe OPTION(MAXRECURSION 100);
        IF @Cycle=1 THROW 51209,N'Không thể chọn cấp dưới làm quản lý thay thế (vòng lặp nhân sự).',1;

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

        THROW;
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

        THROW;
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

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @SoLuong IS NULL OR @SoLuong <= 0
            THROW 51005, N'Số lượng điều chuyển phải lớn hơn 0!', 1;

        IF @MaKhoXuat = @MaKhoNhap
            THROW 51006, N'Kho xuất và kho nhập không được trùng nhau!', 1;

        -- =====================================================================
        -- [SLIDE 10: TRIỆT TIÊU HOÀN TOÀN DEADLOCK BẰNG KỸ THUẬT LOCK ORDERING]
        -- BỐI CẢNH VẤN ĐỀ:
        --   Nếu Phiên 1 chuyển Kho 1 -> Kho 2 (khóa 1 trước, đòi khóa 2 sau).
        --   Nếu Phiên 2 chuyển Kho 2 -> Kho 1 (khóa 2 trước, đòi khóa 1 sau).
        --   => Hai phiên ghì nhau tạo thành vòng tròn chờ (Wait-For Graph Cycle).
        --   => SQL Server bắn mã lỗi 1205 (Deadlock Victim) và Rollback 1 phiên!
        --
        -- GIẢI PHÁP LOCK ORDERING (MIN TRƯỚC, MAX SAU):
        --   BẮT BUỘC mọi phiên chuyển hàng, dù đi từ đâu sang đâu, CŨNG PHẢI:
        --   "Khóa kho có mã số nhỏ trước (@KhoNho), rồi mới khóa kho có mã lớn sau (@KhoLon)".
        -- =====================================================================

        -- BƯỚC 1: Dùng biểu thức CASE WHEN để tìm số nhỏ hơn và số lớn hơn
        -- (Dù @MaKhoXuat=1, @MaKhoNhap=2 hay ngược lại thì @KhoNho luôn = 1, @KhoLon luôn = 2)
        DECLARE @KhoNho INT = CASE WHEN @MaKhoXuat < @MaKhoNhap THEN @MaKhoXuat ELSE @MaKhoNhap END;
        DECLARE @KhoLon INT = CASE WHEN @MaKhoXuat < @MaKhoNhap THEN @MaKhoNhap ELSE @MaKhoXuat END;

        -- BƯỚC 2: Chiếm trước chìa khóa (Pre-locking) theo đúng thứ tự tăng dần
        -- @DummyLock: Biến tạm bù nhìn để hứng kết quả SELECT, tránh in rác ra màn hình.
        -- UPDLOCK: Chiếm quyền chuẩn bị sửa, cấm phiên khác nhảy vào tranh cướp.
        -- HOLDLOCK: Neo giữ ổ khóa này ở cấp độ SERIALIZABLE đến khi COMMIT mới nhả ra.
        DECLARE @DummyLock INT;

        -- 2.1: Luôn luôn khóa kho có mã nhỏ trước!
        -- Phiên nào đến sau dù chuyển hàng chiều nào cũng bị chặn đứng chờ ngay tại đây.
        SELECT @DummyLock = SoLuongTon FROM TonKho WITH (UPDLOCK, HOLDLOCK) WHERE MaKho = @KhoNho AND MaSP = @MaSP;

        -- 2.2: Sau khi đã nắm chắc chìa khóa kho nhỏ, mới khóa tiếp kho có mã lớn hơn!
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

        THROW;
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
