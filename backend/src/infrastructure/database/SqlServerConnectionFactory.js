const sql = require('mssql');
require('dotenv').config();

class SqlServerConnectionFactory {
  constructor() {
    this.pools = new Map();
  }

  getBaseConfig() {
    return {
      server: process.env.DB_SERVER || process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 14333,
      database: process.env.DB_NAME || 'QuanLyBanHangDB',
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
  }

  async getPool(user, password) {
    const username = user || process.env.DB_USER || 'sa';
    const pwd = password || process.env.DB_PASSWORD || 'PasswordAdmin@2026';
    const crypto = require('crypto');
    const pwdHash = crypto.createHash('sha256').update(pwd).digest('hex').substring(0, 10);
    const poolKey = `${username}_${pwdHash}_${process.env.DB_NAME}`;

    if (this.pools.has(poolKey)) {
      const existingPool = this.pools.get(poolKey);
      if (existingPool.connected) {
        return existingPool;
      }
    }

    const config = {
      ...this.getBaseConfig(),
      user: username,
      password: pwd
    };

    try {
      const pool = new sql.ConnectionPool(config);
      const connectedPool = await pool.connect();
      this.pools.set(poolKey, connectedPool);
      return connectedPool;
    } catch (err) {
      throw new Error(`Kết nối CSDL thất bại cho tài khoản [${username}]: ${err.message}`);
    }
  }

  async closeAll() {
    for (const [key, pool] of this.pools.entries()) {
      await pool.close();
      this.pools.delete(key);
    }
  }
}

// Export Singleton Instance
module.exports = new SqlServerConnectionFactory();
