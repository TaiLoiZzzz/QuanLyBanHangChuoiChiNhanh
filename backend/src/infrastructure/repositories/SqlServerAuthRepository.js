const IAuthRepository = require('../../core/domain/repositories/IAuthRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');
class SqlServerAuthRepository extends IAuthRepository {
  async authenticate(username, password) {
    // Always authenticate a fresh connection, even when a pool for this user exists.
    const pool = connectionFactory.createPool(username, password);
    try {
      await pool.connect();
      const result = await pool.request().query(`
        SELECT CASE WHEN IS_SRVROLEMEMBER('sysadmin') = 1 OR IS_MEMBER('Role_Admin') = 1 THEN 'Role_Admin'
          WHEN IS_MEMBER('Role_QuanLyChiNhanh') = 1 THEN 'Role_QuanLyChiNhanh'
          WHEN IS_MEMBER('Role_ThuNgan') = 1 THEN 'Role_ThuNgan'
          WHEN IS_MEMBER('Role_ThuKho') = 1 THEN 'Role_ThuKho' END AS RoleName;`);
      const role = result.recordset[0].RoleName;
      if (!role) { const err = new Error('Tài khoản chưa được cấp vai trò ứng dụng.'); err.status = 403; throw err; }
      return { success: true, username, role };
    } finally { await pool.close(); }
  }
}
module.exports = SqlServerAuthRepository;
