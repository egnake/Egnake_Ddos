#  Egnake DDoS Platform
Advanced HTTP/2 DDoS Attack Platform with Proxy Support

##  Features

### 🆕 Advanced HTTP/2 Attack (Egnake Style)
- **HTTP/2 Multiplexing**: Single TCP connection, multiple streams
- **TLS Fingerprint Evasion**: Multiple cipher suites and TLS versions
- **Proxy Support**: Automatic proxy rotation with CONNECT tunneling
- **Header Spoofing**: Realistic browser headers with `header-generator`
- **IP Spoofing**: Random X-Forwarded-For, Client-IP, Real-IP headers
- **Referer Randomization**: Random search engine referers

###  Attack Types
1. **HTTP/2 Advanced (Egnake)**: Modern HTTP/2 attack with proxy support
2. **HTTP Flood**: Traditional HTTP/1.1 flood
3. **TCP Flood**: Connection exhaustion attack
4. **UDP Flood**: Bandwidth saturation attack

### 🔧 Technical Features
- **Worker Threads**: Isolated attack processes
- **Real-time Stats**: WebSocket live statistics
- **Web Interface**: Modern dashboard with attack controls
- **Proxy Management**: JSON-based proxy database
- **Resource Management**: Configurable threads and rates

##  Installation

```bash
# Clone the repository (if applicable)
# cd into the directory

# Install dependencies
npm install

# Start the platform
npm start
```

##  Project Structure

```
egnake_ddos/
├── src/
│   ├── app.js                 # Application entry point
│   ├── web-server.js          # Web interface server
│   ├── core/
│   │   └── engine.js          # DDoS engine core
│   └── workers/
│       ├── egnake_http2.js    # Advanced HTTP/2 attack
│       ├── http_flood.js      # HTTP flood attack
│       ├── tcp_flood.js       # TCP flood attack
│       └── udp_flood.js       # UDP flood attack
├── public/
│   └── index.html            # Web dashboard
├── proxies/
│   └── proxies.json          # Proxy database
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🎮 Usage

### Web Interface
1. Start the server: `npm start`
2. Open browser: `http://localhost:3000`
3. Configure attack parameters:
   - **Target URL**: Website or IP:Port
   - **Attack Type**: HTTP/2 Advanced (Egnake) recommended
   - **Duration**: Attack duration in seconds
   - **Threads**: Number of concurrent workers
   - **Rate**: Requests per second per thread
   - **Port**: Target port (default: 80/443)

### API Endpoints
- `POST /api/attack/start` - Start new attack
- `POST /api/attack/stop/:id` - Stop specific attack
- `POST /api/attack/stop-all` - Stop all attacks
- `GET /api/attacks` - Get active attacks
- `POST /api/proxies/reload` - Reload proxy list

### Proxy Management
Proxies are stored in `proxies/proxies.json`:
```json
{
  "proxies": [
    {
      "ip": "1.2.3.4",
      "port": 8080,
      "protocol": "http",
      "active": true
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `MAX_MEMORY`: Node.js memory limit (default: 8192MB)

### package.json Scripts
- `npm start`: Start the platform
- Customize memory: `node --max-old-space-size=16384 src/app.js`

## !!!! Legal Disclaimer !!!!!!

**This tool is for educational and authorized testing purposes only.**

- Use only on systems you own or have explicit permission to test
- Unauthorized use against systems you don't own is illegal
- The author is not responsible for misuse
- Check local laws before use

##  Security Features

1. **Rate Limiting**: Configurable request rates
2. **Thread Limits**: Maximum thread count restrictions
3. **Memory Management**: Worker isolation
4. **Proxy Validation**: Active proxy checking
5. **Timeout Controls**: Connection timeouts

##  Technical Details

### HTTP/2 Advanced Attack (Egnake)
- Uses Node.js `http2` module for HTTP/2 support
- Implements TLS 1.2/1.3 with multiple cipher suites
- Randomizes TLS fingerprints to evade detection
- Supports proxy chaining via CONNECT method
- Generates realistic browser headers

### Performance
- **Max Threads**: Configurable (recommended: 10-50)
- **Max Rate**: Configurable per thread
- **Memory**: Isolated worker threads
- **Network**: Proxy support reduces source IP exposure

##  Monitoring

### Dashboard Features
- Real-time attack statistics
- Active proxy count
- Request/byte counters
- Attack duration tracking
- Individual attack controls

### WebSocket Events
- `stats`: Live platform statistics
- `attacks`: Active attack updates


### Future Improvements
- [ ] SOCKS5 proxy support
- [ ] Attack scheduling
- [ ] Target health monitoring
- [ ] Attack templates
- [ ] API authentication

##  Troubleshooting

### Common Issues
1. **"port already in use"**: Change PORT environment variable
2. **"memory limit exceeded"**: Increase --max-old-space-size
3. **"proxy connection failed"**: Check proxy list and network
4. **"attack not starting"**: Verify target URL format

### Logs
- Check console output for errors
- Monitor worker thread messages
- Verify proxy connectivity

##  References

- Node.js Documentation
- HTTP/2 Specification (RFC 7540)
- TLS 1.3 Specification (RFC 8446)
- Proxy Protocol Documentation

##  License

MIT License - See included LICENSE file for details

---
**Use responsibly and ethically.**
