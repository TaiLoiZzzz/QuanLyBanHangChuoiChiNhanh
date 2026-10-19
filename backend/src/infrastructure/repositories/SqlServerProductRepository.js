const sql = require('mssql');
const IProductRepository = require('../../core/domain/repositories/IProductRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerProductRepository extends IProductRepository {
  async getAllProducts(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    const query = `
      SELECT sp.MaSP, sp.TenSP, sp.MaDM, dm.TenDM, sp.GiaBanHienTai, sp.DonViTinh, sp.DaXoa,
             ISNULL(SUM(tk.SoLuongTon), 0) AS TongTonKho
      FROM SanPham sp
      INNER JOIN DanhMuc dm ON sp.MaDM = dm.MaDM
      LEFT JOIN TonKho tk ON sp.MaSP = tk.MaSP
      WHERE sp.DaXoa = 0
      GROUP BY sp.MaSP, sp.TenSP, sp.MaDM, dm.TenDM, sp.GiaBanHienTai, sp.DonViTinh, sp.DaXoa
      ORDER BY sp.MaSP ASC;
    `;
    const result = await request.query(query);
    return result.recordset;
  }

  async searchProducts({ tuKhoa, maDM, giaMin, giaMax }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('TuKhoa', sql.NVarChar(150), tuKhoa || null);
    request.input('MaDM', sql.Int, maDM ? Number(maDM) : null);
    request.input('GiaMin', sql.Decimal(12, 2), giaMin ? Number(giaMin) : null);
    request.input('GiaMax', sql.Decimal(12, 2), giaMax ? Number(giaMax) : null);

    const result = await request.execute('dbo.sp_TimKiemSanPhamNangCao');
    return result.recordset;
  }

  async createProduct({ tenSP, maDM, giaBanHienTai, donViTinh }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    request.input('TenSP', sql.NVarChar(150), tenSP);
    request.input('MaDM', sql.Int, maDM);
    request.input('GiaBanHienTai', sql.Decimal(12, 2), giaBanHienTai);
    request.input('DonViTinh', sql.NVarChar(20), donViTinh);

    const query = `
      INSERT INTO SanPham (TenSP, MaDM, GiaBanHienTai, DonViTinh, DaXoa)
      OUTPUT INSERTED.MaSP, INSERTED.TenSP, INSERTED.MaDM, INSERTED.GiaBanHienTai, INSERTED.DonViTinh
      VALUES (@TenSP, @MaDM, @GiaBanHienTai, @DonViTinh, 0);
    `;
    const result = await request.query(query);
    const newSp = result.recordset[0];

    // Tạo sẵn tồn kho 0 cho các kho hàng hiện có
    const initStockQuery = `
      INSERT INTO TonKho (MaKho, MaSP, SoLuongTon)
      SELECT MaKho, @MaSP, 0 FROM KhoHang;
    `;
    const stockRequest = pool.request();
    stockRequest.input('MaSP', sql.Int, newSp.MaSP);
    await stockRequest.query(initStockQuery);

    return newSp;
  }

  async updateProduct(id, { tenSP, maDM, giaBanHienTai, donViTinh }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    request.input('MaSP', sql.Int, id);
    request.input('TenSP', sql.NVarChar(150), tenSP);
    request.input('MaDM', sql.Int, maDM);
    request.input('GiaBanHienTai', sql.Decimal(12, 2), giaBanHienTai);
    request.input('DonViTinh', sql.NVarChar(20), donViTinh);

    const query = `
      UPDATE SanPham
      SET TenSP = @TenSP, MaDM = @MaDM, GiaBanHienTai = @GiaBanHienTai, DonViTinh = @DonViTinh
      OUTPUT INSERTED.MaSP, INSERTED.TenSP, INSERTED.MaDM, INSERTED.GiaBanHienTai, INSERTED.DonViTinh
      WHERE MaSP = @MaSP AND DaXoa = 0;
    `;
    const result = await request.query(query);
    return result.recordset[0];
  }

  async deleteProduct(id, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    request.input('MaSP', sql.Int, id);

    const query = `
      UPDATE SanPham
      SET DaXoa = 1
      WHERE MaSP = @MaSP;
    `;
    await request.query(query);
    return { success: true, message: 'Đã xóa mềm sản phẩm thành công!' };
  }
}

module.exports = SqlServerProductRepository;
