const app = require('./app');
const factory = require('./infrastructure/database/SqlServerConnectionFactory');
let server;
async function shutdown(code=0) {
  if(server) {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  await factory.closeAll();process.exitCode=code;
}
async function start() {
  const pool=await factory.getPool();await pool.request().query('SELECT 1 AS ready');
  const port=Number(process.env.PORT)||5000;
  server=app.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Retail ready: http://${process.env.HOST||'127.0.0.1'}:${port}`));
  server.on('error',async err=>{console.error('HTTP startup failed:',err.code);await shutdown(1);});
}
start().catch(async err=>{console.error('Startup failed. Check backend/.env and database readiness:',err.code||err.message);await shutdown(1);});
process.on('SIGTERM',()=>shutdown());process.on('SIGINT',()=>shutdown());
