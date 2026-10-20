const sql = require('mssql');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

class SqlServerConnectionFactory {
  constructor() { this.pools = new Map(); }
  getBaseConfig() {
    return {
      server: process.env.DB_SERVER || process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 11433,
      database: process.env.DB_NAME || 'QuanLyBanHangDB',
      connectionTimeout: 10000, requestTimeout: 30000,
      options: { encrypt: process.env.DB_ENCRYPT === 'true', trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' },
      pool: { max: 5, min: 0, idleTimeoutMillis: 30000 }
    };
  }
  createPool(user, password) {
    if (typeof user !== 'string' || !user || typeof password !== 'string' || !password) {
      const err = new Error('Thiếu cấu hình tài khoản CSDL.'); err.status = 503; throw err;
    }
    return new sql.ConnectionPool({ ...this.getBaseConfig(), user, password });
  }
  async getPool(user = process.env.DB_USER, password = process.env.DB_PASSWORD) {
    const base = this.getBaseConfig();
    const key = crypto.createHash('sha256').update(JSON.stringify([base.server, base.port, base.database, user, password])).digest('hex');
    if (!this.pools.has(key)) {
      if (this.pools.size >= 64) { const err = new Error('Hệ thống đang bận.'); err.status = 503; throw err; }
      const pool = this.createPool(user, password);
      const pending = pool.connect().catch(async err => { this.pools.delete(key); await pool.close().catch(() => {}); throw err; });
      this.pools.set(key, pending);
    }
    const pool = await this.pools.get(key);
    if (!pool.connected) { this.pools.delete(key); return this.getPool(user, password); }
    return pool;
  }
  async closeAll() {
    const pools = [...this.pools.values()]; this.pools.clear();
    await Promise.allSettled(pools.map(async pending => (await pending).close()));
  }
}
module.exports = new SqlServerConnectionFactory();
