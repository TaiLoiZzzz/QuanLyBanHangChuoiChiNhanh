require('dotenv').config();
const app = require('./app');
const connectionFactory = require('./infrastructure/database/SqlServerConnectionFactory');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log('================================================================');
  console.log(`Backend Server dang khoi chay tai: http://localhost:${PORT}`);
  console.log('Kien truc: Clean Architecture (OOP) + Raw SQL Driver mssql');
  console.log('Ket noi CSDL: SQL Server 2022 (Port 14333) -> QuanLyBanHangDB');
  console.log('================================================================');

  try {
    const pool = await connectionFactory.getPool();
    console.log('Kiem tra ket noi CSDL SQL Server: THANH CONG');
  } catch (err) {
    console.error('Kiem tra ket noi CSDL SQL Server: THAT BAI -', err.message);
  }
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('Dang dong server va connection pools...');
  await connectionFactory.closeAll();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('Dang dong server va connection pools...');
  await connectionFactory.closeAll();
  server.close(() => process.exit(0));
});
