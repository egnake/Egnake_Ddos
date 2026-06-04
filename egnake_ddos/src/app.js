const WebServer = require('./web-server');

const server = new WebServer(3000);
server.start();

process.on('SIGINT', () => {
  console.log('\n[!] Shutting down...');
  server.engine.stopAllAttacks();
  process.exit(0);
});