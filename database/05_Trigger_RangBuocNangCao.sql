-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 5: XÂY DỰNG 5 TRIGGER CHUYÊN SÂU (CHUẨN MULTI-ROW VÀ TOÀN VẸN DỮ LIỆU)
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- XÓA TRIGGER NẾU ĐÃ TỒN TẠI ĐỂ CHẠY LẠI KHÔNG BỊ TRÙNG
IF OBJECT_ID('dbo.trg_ChiTietDonHang_SyncKho_TongTien', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_ChiTietDonHang_SyncKho_TongTien;
IF OBJECT_ID('dbo.trg_ChiTietDonHang_KiemTraTonKhoTruocKhiGhi', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_ChiTietDonHang_KiemTraTonKhoTruocKhiGhi;
IF OBJECT_ID('dbo.trg_ChiTietDonHang_TruTonKho', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_ChiTietDonHang_TruTonKho;
IF OBJECT_ID('dbo.trg_SanPham_LichSuGia', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_SanPham_LichSuGia;
IF OBJECT_ID('dbo.trg_DonHang_CapNhatDiemTichLuyKhachHang', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_DonHang_CapNhatDiemTichLuyKhachHang;
IF OBJECT_ID('dbo.trg_DonHang_CamXoaDonDaGiao', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_DonHang_CamXoaDonDaGiao;
IF OBJECT_ID('dbo.trg_NhanVien_AuditLog', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_NhanVien_AuditLog;
GO

-- =========================================================================
-- TRIGGER 1 (AFTER INSERT, UPDATE, DELETE): ĐỒNG BỘ TOÀN DIỆN TỒN KHO & TỔNG TIỀN
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- Nghiệp vụ chuyên sâu:
--   - Chặn đứng tình trạng bán hàng vượt quá tồn kho (Bán khống)
--   - Tự động trừ kho khi INSERT, bù trừ chênh lệch khi UPDATE, hoàn tồn kho khi DELETE
--   - Đồng bộ giá trị TongTien cho bảng DonHang (Bảo đảm tính toàn vẹn 3NF phi chuẩn hóa)
-- Kỹ thuật: 100% Set-based multi-row, kiểm tra @@ROWCOUNT = 0 chốt chặn hiệu năng
-- =========================================================================
CREATE TRIGGER trg_ChiTietDonHang_SyncKho_TongTien
ON ChiTietDonHang
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Chốt chặn hiệu năng: Nếu không có dòng nào bị tác động thì thoát ngay
    IF @@ROWCOUNT = 0 RETURN;

    -- =========================================================================
    -- TRƯỜNG HỢP A: THAO TÁC INSERT (THÊM MỚI CHI TIẾT ĐƠN HÀNG)
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        -- A.1. Kiểm tra tồn kho trước khi cho phép trừ (Chống bán âm kho)
        IF EXISTS (
            SELECT 1
            FROM (
                SELECT dh.MaKhoXuat, i.MaSP, SUM(i.SoLuong) AS TongSoLuongYeuCau
                FROM inserted i
                INNER JOIN DonHang dh ON i.MaDH = dh.MaDH
                GROUP BY dh.MaKhoXuat, i.MaSP
            ) req
            INNER JOIN TonKho tk ON req.MaKhoXuat = tk.MaKho AND req.MaSP = tk.MaSP
            WHERE tk.SoLuongTon < req.TongSoLuongYeuCau
        )
        BEGIN
            RAISERROR (N'Lỗi giao dịch: Không đủ số lượng tồn kho để đáp ứng đơn hàng mới!', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- A.2. Trừ số lượng trong TonKho
        UPDATE tk
        SET tk.SoLuongTon = tk.SoLuongTon - req.TongSoLuongYeuCau
        FROM TonKho tk
        INNER JOIN (
            SELECT dh.MaKhoXuat, i.MaSP, SUM(i.SoLuong) AS TongSoLuongYeuCau
            FROM inserted i
            INNER JOIN DonHang dh ON i.MaDH = dh.MaDH
            GROUP BY dh.MaKhoXuat, i.MaSP
        ) req ON tk.MaKho = req.MaKhoXuat AND tk.MaSP = req.MaSP;
    END;

    -- =========================================================================
    -- TRƯỜNG HỢP B: THAO TÁC UPDATE (ĐIỀU CHỈNH SỐ LƯỢNG MUA TRONG ĐƠN)
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        IF UPDATE(SoLuong)
        BEGIN
            -- B.1. Kiểm tra nếu tăng số lượng thì kho có đủ hàng bù đắp không
            IF EXISTS (
                SELECT 1
                FROM (
                    SELECT dh.MaKhoXuat, i.MaSP, SUM(i.SoLuong - d.SoLuong) AS ChenhLechTang
                    FROM inserted i
                    INNER JOIN deleted d ON i.MaDH = d.MaDH AND i.MaSP = d.MaSP
                    INNER JOIN DonHang dh ON i.MaDH = dh.MaDH
                    GROUP BY dh.MaKhoXuat, i.MaSP
                ) delta
                INNER JOIN TonKho tk ON delta.MaKhoXuat = tk.MaKho AND delta.MaSP = tk.MaSP
                WHERE delta.ChenhLechTang > 0 AND tk.SoLuongTon < delta.ChenhLechTang
            )
            BEGIN
                RAISERROR (N'Lỗi cập nhật: Số lượng tăng thêm vượt quá tồn kho khả dụng!', 16, 1);
                ROLLBACK TRANSACTION;
                RETURN;
            END;

            -- B.2. Cập nhật lại tồn kho theo giá trị bù trừ
            UPDATE tk
            SET tk.SoLuongTon = tk.SoLuongTon - delta.ChenhLech
            FROM TonKho tk
            INNER JOIN (
                SELECT dh.MaKhoXuat, i.MaSP, SUM(i.SoLuong - d.SoLuong) AS ChenhLech
                FROM inserted i
                INNER JOIN deleted d ON i.MaDH = d.MaDH AND i.MaSP = d.MaSP
                INNER JOIN DonHang dh ON i.MaDH = dh.MaDH
                GROUP BY dh.MaKhoXuat, i.MaSP
            ) delta ON tk.MaKho = delta.MaKhoXuat AND tk.MaSP = delta.MaSP;
        END;
    END;

    -- =========================================================================
    -- TRƯỜNG HỢP C: THAO TÁC DELETE (XÓA BỚT MÓN HÀNG RA KHỎI ĐƠN)
    -- =========================================================================
    IF NOT EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        -- Hoàn trả số lượng đã xóa về lại cho TonKho
        UPDATE tk
        SET tk.SoLuongTon = tk.SoLuongTon + del.TongSoLuongHoan
        FROM TonKho tk
        INNER JOIN (
            SELECT dh.MaKhoXuat, d.MaSP, SUM(d.SoLuong) AS TongSoLuongHoan
            FROM deleted d
            INNER JOIN DonHang dh ON d.MaDH = dh.MaDH
            GROUP BY dh.MaKhoXuat, d.MaSP
        ) del ON tk.MaKho = del.MaKhoXuat AND tk.MaSP = del.MaSP;
    END;

    -- =========================================================================
    -- ĐỒNG BỘ CỘT TỔNG TIỀN TRONG BẢNG ĐƠN HÀNG (CHO CẢ 3 THAO TÁC INSERT/UPDATE/DELETE)
    -- =========================================================================
    UPDATE dh
    SET dh.TongTien = ISNULL(sub.TongTienChiTiet, 0)
    FROM DonHang dh
    INNER JOIN (
        SELECT affected.MaDH, SUM(ct.ThanhTien) AS TongTienChiTiet
        FROM (
            SELECT MaDH FROM inserted
            UNION
            SELECT MaDH FROM deleted
        ) affected
        LEFT JOIN ChiTietDonHang ct ON affected.MaDH = ct.MaDH
        GROUP BY affected.MaDH
    ) sub ON dh.MaDH = sub.MaDH;
END;
GO

PRINT N'Da tao thanh cong TRIGGER 1 (AFTER INSERT, UPDATE, DELETE): trg_ChiTietDonHang_SyncKho_TongTien';
GO

-- =========================================================================
-- TRIGGER 2 (AFTER UPDATE): AUDIT LOG THAY ĐỔI GIÁ SẢN PHẨM (THEO DÕI LỊCH SỬ GIÁ)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Nghiệp vụ: Tự động ghi vết vào bảng LichSuGia mỗi khi giá bán thay đổi
-- Kỹ thuật Multi-row: So sánh bảng ảo inserted và deleted, hỗ trợ cập nhật giá hàng loạt
-- =========================================================================
CREATE TRIGGER trg_SanPham_LichSuGia
ON SanPham
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Chỉ kích hoạt khi cột GiaBanHienTai thực sự được cập nhật
    IF UPDATE(GiaBanHienTai)
    BEGIN
        INSERT INTO LichSuGia (MaSP, GiaCu, GiaMoi, NgayThayDoi, NguoiThayDoi)
        SELECT 
            i.MaSP,
            d.GiaBanHienTai AS GiaCu,
            i.GiaBanHienTai AS GiaMoi,
            GETDATE(),
            ISNULL(SUSER_SNAME(), N'HeThong_Auto') AS NguoiThayDoi
        FROM inserted i
        INNER JOIN deleted d ON i.MaSP = d.MaSP
        WHERE i.GiaBanHienTai <> d.GiaBanHienTai; -- Chỉ ghi khi giá có thay đổi thực sự
    END;
END;
GO

PRINT N'Da tao thanh cong TRIGGER 2 (AFTER UPDATE): trg_SanPham_LichSuGia';
GO

-- =========================================================================
-- TRIGGER 3 (AFTER UPDATE): TÍCH ĐIỂM THƯỞNG & TỰ ĐỘNG NÂNG HẠNG VIP KHÁCH HÀNG
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
-- Nghiệp vụ: Khi đơn hàng chuyển trạng thái sang 3 (Giao thành công):
--            - Cộng điểm tích lũy: Cứ 100.000đ = 1 điểm
--            - Nếu điểm >= 1000: Tự động nâng hạng lên 1 (VIP)
--            - Nếu điểm >= 5000: Tự động nâng hạng lên 2 (Kim Cương)
-- Kỹ thuật Multi-row: Group by theo MaKH từ các đơn chuyển trạng thái thành công
-- =========================================================================
CREATE TRIGGER trg_DonHang_CapNhatDiemTichLuyKhachHang
ON DonHang
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Chỉ kích hoạt khi cột TrangThai được cập nhật sang 3 (Giao thành công)
    IF UPDATE(TrangThai)
    BEGIN
        -- Bảng tạm tính tổng điểm cộng cho từng khách hàng từ các đơn vừa hoàn thành
        UPDATE kh
        SET 
            kh.DiemTichLuy = kh.DiemTichLuy + diem.DiemCongThem,
            kh.LoaiKH = CASE 
                WHEN (kh.DiemTichLuy + diem.DiemCongThem) >= 5000 THEN 2 -- Kim Cương
                WHEN (kh.DiemTichLuy + diem.DiemCongThem) >= 1000 THEN 1 -- VIP
                ELSE kh.LoaiKH
            END
        FROM KhachHang kh
        INNER JOIN (
            SELECT 
                i.MaKH,
                SUM(CAST(i.TongTien / 100000 AS INT)) AS DiemCongThem
            FROM inserted i
            INNER JOIN deleted d ON i.MaDH = d.MaDH
            WHERE i.TrangThai = 3 AND d.TrangThai <> 3 -- Chỉ tính đơn vừa đổi sang Giao thành công
            GROUP BY i.MaKH
        ) diem ON kh.MaKH = diem.MaKH;
    END;
END;
GO

PRINT N'Da tao thanh cong TRIGGER 3 (AFTER UPDATE): trg_DonHang_CapNhatDiemTichLuyKhachHang';
GO

-- =========================================================================
-- TRIGGER 4 (INSTEAD OF DELETE): CẤM XÓA ĐƠN HÀNG ĐÃ GIAO THÀNH CÔNG (CHỐNG GIAN LẬN)
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
-- Nghiệp vụ: Bảo vệ toàn vẹn chứng từ kế toán. Tuyệt đối không cho phép xóa đơn đã giao (TrangThai = 3)
-- Kỹ thuật Multi-row: Quét toàn bộ bảng deleted, chỉ cần 1 đơn vi phạm là chặn đứng toàn bộ lô xóa
-- =========================================================================
CREATE TRIGGER trg_DonHang_CamXoaDonDaGiao
ON DonHang
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra nếu trong lô xóa có chứa đơn hàng đã giao thành công
    IF EXISTS (
        SELECT 1 
        FROM deleted 
        WHERE TrangThai = 3
    )
    BEGIN
        RAISERROR (N'Lỗi bảo mật kế toán: Nghiêm cấm xóa đơn hàng đã giao thành công (TrangThai = 3)!', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END;

    -- Nếu chỉ xóa các đơn hợp lệ (Mới tạo, Đã hủy...), xóa Chi tiết trước rồi xóa Đơn hàng
    DELETE FROM ChiTietDonHang
    WHERE MaDH IN (SELECT MaDH FROM deleted);

    DELETE FROM DonHang
    WHERE MaDH IN (SELECT MaDH FROM deleted);
END;
GO

PRINT N'Da tao thanh cong TRIGGER 4 (INSTEAD OF DELETE): trg_DonHang_CamXoaDonDaGiao';
GO

-- =========================================================================
-- TRIGGER 5 (AFTER INSERT, UPDATE): GHI NHẬT KÝ BẢO MẬT HỆ THỐNG KHI THAY ĐỔI NHÂN SỰ
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
-- Nghiệp vụ: Tự động ghi vết vào NhatKyHeThong khi có nhân viên mới hoặc chỉnh sửa nhân sự
-- Kỹ thuật Multi-row: Phân biệt thao tác INSERT vs UPDATE bằng tương quan deleted / inserted
-- =========================================================================
CREATE TRIGGER trg_NhanVien_AuditLog
ON NhanVien
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Phân biệt hành động: Nếu deleted không có dòng nào -> INSERT; ngược lại -> UPDATE
    DECLARE @HanhDong NVARCHAR(100);
    IF NOT EXISTS (SELECT 1 FROM deleted)
        SET @HanhDong = N'THEM_NHAN_VIEN_MOI';
    ELSE
        SET @HanhDong = N'CAP_NHAT_THONG_TIN_NHAN_VIEN';

    INSERT INTO NhatKyHeThong (HanhDong, NoiDung, ThoiGian, NguoiThucHien)
    SELECT 
        @HanhDong,
        N'Mã NV: ' + CAST(i.MaNV AS NVARCHAR(10)) + 
        N', Họ tên: ' + i.HoTen + 
        N', Chi nhánh: ' + CAST(i.MaCN AS NVARCHAR(10)) + 
        N', Trạng thái xóa: ' + CAST(i.DaXoa AS NVARCHAR(2)),
        GETDATE(),
        ISNULL(SUSER_SNAME(), N'HeThong_Admin')
    FROM inserted i;
END;
GO

PRINT N'Da tao thanh cong TRIGGER 5 (AFTER INSERT, UPDATE): trg_NhanVien_AuditLog';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 TRIGGER CHUAN MULTI-ROW VA BAO MAT CUA CO THE!';
PRINT N'=========================================================================';
GO
