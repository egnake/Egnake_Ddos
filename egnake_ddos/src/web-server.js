const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const DDoSEngine = require('./core/engine');

class WebServer {
  constructor(port) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, { cors: { origin: '*' } });
    this.engine = new DDoSEngine();
    global.io = this.io;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(process.cwd(), 'public')));
  }

  setupRoutes() {
    this.app.post('/api/attack/start', async (req, res) => {
      const { type, target, duration, threads, rate, port } = req.body;
      if (!target) return res.status(400).json({ success: false, error: 'Target is required' });

      try {
        const attackId = await this.engine.startAttack(type, target, {
          duration: parseInt(duration) || 60,
          threads: parseInt(threads) || 10,
          rate: parseInt(rate) || 500,
          port: parseInt(port) || 80
        });
        res.json({ success: true, attackId });
      } catch (e) {
        res.status(500).json({ success: false, error: e.message });
      }
    });

    this.app.post('/api/attack/stop/:id', (req, res) => {
      this.engine.stopAttack(req.params.id);
      res.json({ success: true });
    });

    this.app.post('/api/attack/stop-all', (req, res) => {
      this.engine.stopAllAttacks();
      res.json({ success: true });
    });

    this.app.get('/api/attacks', (req, res) => {
      res.json({ success: true, attacks: this.engine.getAllAttacks() });
    });

    this.app.post('/api/proxies/reload', (req, res) => {
      this.engine.loadProxies();
      res.json({ success: true, count: this.engine.proxies.length });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      socket.emit('attacks', this.engine.getAllAttacks());
    });

    setInterval(() => {
      this.io.emit('attacks', this.engine.getAllAttacks());
    }, 800);
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`[SYS] Core Server running at http://localhost:${this.port}`);
    });
  }
}

module.exports = WebServer;