const sql = require('mssql');
const IProductRepository = require('../../core/domain/repositories/IProductRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerProductRepository extends IProductRepository {
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
}

module.exports = SqlServerProductRepository;
