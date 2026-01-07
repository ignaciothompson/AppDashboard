const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const axios = require('axios');
const os = require('os');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup (SQLite)
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
// Ensure data dir exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Ensure uploads dir exists
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

// Multer Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ storage: storage });

// Serve Uploads
app.use('/uploads', express.static(uploadsDir));

// Models
const Section = sequelize.define('Section', {
    title: { type: DataTypes.STRING, allowNull: false },
    order: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const AppItem = sequelize.define('AppItem', {
  name: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  icon: { type: DataTypes.STRING, allowNull: true },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
  type: { type: DataTypes.STRING, defaultValue: 'app' } // 'app' or 'bookmark'
  // SectionId will be added automatically
});

// Relations
Section.hasMany(AppItem, { onDelete: 'CASCADE' });
AppItem.belongsTo(Section);

// Sync Database
// Sync Database (Manual migration for SQLite safety)
async function startDatabase() {
    try {
        // Try to add 'type' column manually if missing (safe way for SQLite)
        try {
            await sequelize.query("ALTER TABLE AppItems ADD COLUMN type VARCHAR(255) DEFAULT 'app';");
            console.log("Added 'type' column to AppItems");
        } catch (e) {
            // Ignore if column already exists
        }

        await sequelize.sync(); // Removed { alter: true } to avoid SQLite unique constraint errors
        console.log('Database synced');
    } catch (err) {
        console.error('Error syncing database:', err);
    }
}
startDatabase();

// Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date() });
});

// --- SECTIONS API ---
app.get('/api/sections', async (req, res) => {
    try {
        const sections = await Section.findAll({ 
            include: [{ model: AppItem, as: 'AppItems' }],
            order: [
                ['order', 'ASC'],
                [{ model: AppItem, as: 'AppItems' }, 'order', 'ASC']
            ]
        });
        res.json(sections);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/sections', async (req, res) => {
    try {
        const { title, order } = req.body;
        const section = await Section.create({ title, order });
        res.json(section);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/sections/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Section.update(req.body, { where: { id } });
        res.json({ success: true });
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

app.delete('/api/sections/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Section.destroy({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- APPS API (Modified) ---
// Create App (Now needs SectionId)
app.post('/api/apps', async (req, res) => {
    try {
        const { name, url, icon, order, SectionId, type } = req.body;
        const app = await AppItem.create({ name, url, icon, order, SectionId, type });
        res.json(app);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/apps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await AppItem.update(req.body, { where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/apps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await AppItem.destroy({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/bookmarks', async (req, res) => {
    try {
        const bookmarks = await AppItem.findAll({ 
            where: { type: 'bookmark' },
            order: [['order', 'ASC']]
        });
        res.json(bookmarks);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- UPLOAD API ---
app.post('/api/upload', upload.single('icon'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Return relative path
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Proxy: Jellyfin Status
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

// Host Info (OS metrics)
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
            // Parse df output
            // Filesystem                Size      Used Available Use% Mounted on
            // overlay                  64.0G     12.3G     51.7G  19% /
            const lines = stdout.trim().split('\n');
            if (lines.length >= 2) {
                const parts = lines[1].split(/\s+/);
                // parts usually: [Filesystem, Size, Used, Avail, Use%, Mounted]
                // We want Size, Used, Use%
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
// Fallback for SPA (using regex to avoid simple-string wildcard issues)
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
