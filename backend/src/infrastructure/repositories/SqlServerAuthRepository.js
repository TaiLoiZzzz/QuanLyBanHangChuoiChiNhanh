const sql = require('mssql');
const IAuthRepository = require('../../core/domain/repositories/IAuthRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerAuthRepository extends IAuthRepository {
  async authenticate(username, password) {
    try {
      // Thử kết nối trực tiếp với tài khoản và mật khẩu cung cấp
      const pool = await connectionFactory.getPool(username, password);
      const request = pool.request();

      // Truy vấn role của User trong CSDL
      const query = `
        SELECT r.name AS RoleName, u.name AS UserName
        FROM sys.database_role_members m
        INNER JOIN sys.database_principals r ON m.role_principal_id = r.principal_id
        INNER JOIN sys.database_principals u ON m.member_principal_id = u.principal_id
        WHERE u.name = USER_NAME();
      `;

      const result = await request.query(query);
      const role = result.recordset?.[0]?.RoleName || (username === 'sa' ? 'sysadmin' : 'Public');

      return {
        success: true,
        username,
        role,
        message: 'Đăng nhập và xác thực phân quyền CSDL thành công!'
      };
    } catch (err) {
      throw new Error(`Đăng nhập thất bại: Tài khoản hoặc mật khẩu SQL Server không chính xác. (${err.message})`);
    }
  }
}

module.exports = SqlServerAuthRepository;
