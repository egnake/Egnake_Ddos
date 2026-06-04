const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Çalıştırılan terminal dizinine göre esnek dosya yolu çözümü
let filePath = path.resolve(__dirname, 'proxies', 'proxies.json');

if (!fs.existsSync(filePath)) {
    // Eğer terminal zaten proxies klasörünün içindeyse bir kademe geriye kontrol ekle
    filePath = path.resolve(__dirname, 'proxies.json');
}

if (!fs.existsSync(filePath)) {
    console.error(`Hata: Dosya hiçbir konumda bulunamadı!`);
    console.log(`Aranan konum: ${filePath}`);
    process.exit(1);
}

// Dosyayı oku ve ayrıştır
const fileContent = fs.readFileSync(filePath, 'utf8');
let rawProxies = [];

try {
    const parsed = JSON.parse(fileContent);
    rawProxies = parsed.proxies || [];
} catch (e) {
    console.error("Hata: proxies.json dosyası geçerli bir JSON formatında değil!");
    process.exit(1);
}

console.log(`Toplam ${rawProxies.length} proxy adresi yüklendi. Test başlatılıyor...`);

async function checkProxy(proxyObj) {
    if (!proxyObj || !proxyObj.ip || !proxyObj.port) return null;

    const host = String(proxyObj.ip).trim();
    const port = parseInt(proxyObj.port, 10);

    if (isNaN(port) || port < 0 || port > 65535) return null;

    try {
        const startTime = Date.now();
        // Güvenilir bir genel uç noktaya bağlantı doğrulaması gönderilir
        await axios.get('http://www.google.com', {
            proxy: { host, port },
            timeout: 3000 // 3 saniyede yanıt vermeyen elenir
        });

        return {
            ...proxyObj,
            active: true,
            latency: Date.now() - startTime,
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        return null;
    }
}

async function startVerification() {
    const workingProxies = [];
    const concurrencyLimit = 50; // Ağ kartını kilitlememek için eşzamanlı istek sınırı

    for (let i = 0; i < rawProxies.length; i += concurrencyLimit) {
        const chunk = rawProxies.slice(i, i + concurrencyLimit);
        const promises = chunk.map(proxy => checkProxy(proxy));
        const results = await Promise.all(promises);

        for (const res of results) {
            if (res) {
                console.log(`[ÇALIŞIYOR] ${res.ip}:${res.port} - Gecikme: ${res.latency}ms`);
                workingProxies.push(res);
            }
        }
    }

    const outputData = { proxies: workingProxies };
    fs.writeFileSync(filePath, JSON.stringify(outputData, null, 4), 'utf8');

    console.log(`\nTest ve Temizlik Tamamlandı!`);
    console.log(`Eski proxy sayısı: ${rawProxies.length}`);
    console.log(`Yeni aktif proxy sayısı: ${workingProxies.length}`);
    console.log(`Elenen ölü proxy sayısı: ${rawProxies.length - workingProxies.length}`);
}

startVerification();