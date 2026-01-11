const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Serve Uploads (Legacy support during transition, though migrated to PB)
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'app_data', 'database.sqlite');
const dataDir = path.dirname(dbPath);
const uploadsDir = path.join(dataDir, 'uploads');
if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
}

// Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date() });
});

// Proxy: Jellyfin Status (Public - no auth needed)
app.get('/api/status/jellyfin', async (req, res) => {
    const { url } = req.query; 
    if (!url) return res.status(400).json({ error: 'URL required' });
    try {
        // Jellyfin Public Info
        const response = await axios.get(`${url}/System/Info/Public`, { timeout: 3000 });
        res.json(response.data);
    } catch (e) {
        res.status(502).json({ error: 'Service unreachable', details: e.message });
    }
});

// Proxy: Jellyfin Status with API Key (simplified - status only)
app.get('/api/jellyfin/status', async (req, res) => {
    const { url, apiKey } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }
    
    const baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
    
    try {
        // Try authenticated request first if API key provided
        if (apiKey) {
            const headers = { 'X-Emby-Token': apiKey };
            const response = await axios.get(`${baseUrl}/System/Info`, { headers, timeout: 5000 });
            res.json({
                online: true,
                serverName: response.data?.ServerName || 'Jellyfin',
                version: response.data?.Version || 'Unknown'
            });
        } else {
            // Fallback to public info
            const response = await axios.get(`${baseUrl}/System/Info/Public`, { timeout: 5000 });
            res.json({
                online: true,
                serverName: response.data?.ServerName || 'Jellyfin',
                version: response.data?.Version || 'Unknown'
            });
        }
    } catch (e) {
        res.json({ online: false, error: e.message });
    }
});

// Generic URL Ping - Check if any website is reachable
app.get('/api/ping', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }
    
    try {
        const startTime = Date.now();
        const response = await axios.head(url, { 
            timeout: 5000,
            validateStatus: () => true // Accept any status code
        });
        const responseTime = Date.now() - startTime;
        
        res.json({
            online: response.status >= 200 && response.status < 500,
            statusCode: response.status,
            responseTime: responseTime
        });
    } catch (e) {
        // Try GET if HEAD fails (some servers don't support HEAD)
        try {
            const startTime = Date.now();
            const response = await axios.get(url, { 
                timeout: 5000,
                validateStatus: () => true,
                maxRedirects: 3
            });
            const responseTime = Date.now() - startTime;
            
            res.json({
                online: response.status >= 200 && response.status < 500,
                statusCode: response.status,
                responseTime: responseTime
            });
        } catch (e2) {
            res.json({ 
                online: false, 
                error: e2.message 
            });
        }
    }
});

// Host Info (OS metrics)
const { exec } = require('child_process');

app.get('/api/status/host', (req, res) => {
    // Basic OS Info
    const basicStats = {
        load: os.loadavg(),
        freemem: os.freemem(),
        totalmem: os.totalmem(),
        uptime: os.uptime(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        network: os.networkInterfaces()
    };

    // Get Disk Info (Linux/Alpine)
    exec('df -h /', (error, stdout, stderr) => {
        if (!error && stdout) {
            const lines = stdout.trim().split('\n');
            if (lines.length >= 2) {
                const parts = lines[1].split(/\s+/);
                if (parts.length >= 5) {
                    basicStats.disk = {
                        size: parts[1],
                        used: parts[2],
                        usage: parts[4]
                    };
                }
            }
        }
        res.json(basicStats);
    });
});

// Serve Frontend
app.use(express.static(path.join(__dirname, 'public')));
// Fallback for SPA
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
