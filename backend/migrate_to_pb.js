const PocketBase = require('pocketbase/cjs');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

// --- CONFIGURATION ---
const PB_URL = 'https://addb.ignaciothompson.com';
const PB_ADMIN_EMAIL = 'chonathomp@gmail.com';
const PB_ADMIN_PASSWORD = 'ChonaPocket/';
const SQLITE_DB_PATH = path.join(__dirname, '..', 'app_data', 'database.sqlite');

// --- POCKETBASE SETUP ---
const pb = new PocketBase(PB_URL);

// --- SEQUELIZE SETUP (Read-only from legacy DB) ---
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: SQLITE_DB_PATH,
    logging: false
});

const Section = sequelize.define('Section', {
    title: { type: DataTypes.STRING, allowNull: false },
    order: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const AppItem = sequelize.define('AppItem', {
    name: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: true }, // URL or Path
    order: { type: DataTypes.INTEGER, defaultValue: 0 },
    type: { type: DataTypes.STRING, defaultValue: 'app' } 
});

// Relations
Section.hasMany(AppItem, { onDelete: 'CASCADE' });
AppItem.belongsTo(Section);

async function createCollections() {
    console.log('Checking collections...');
    try {
        await pb.collections.getOne('sections');
        console.log(' - "sections" collection exists.');
    } catch {
        console.log(' - Creating "sections" collection...');
        await pb.collections.create({
            name: 'sections',
            type: 'base',
            schema: [
                { name: 'title', type: 'text', required: true },
                { name: 'order', type: 'number', required: false }
            ],
            listRule: '', // Public read
            viewRule: '',
            createRule: '', // Public write (or admin only, but for this app maybe open?) -> Let's keep it admin/user only usually, but app requirements imply auth? 
            // The current app is open. Let's make it public for now to match behavior, or just rely on Admin usage.
            // Actually the current app has no auth. Anyone can edit.
            // So we set rules to "" (public).
            updateRule: '',
            deleteRule: '',
        });
    }

    try {
        await pb.collections.getOne('apps');
        console.log(' - "apps" collection exists.');
    } catch {
        console.log(' - Creating "apps" collection...');
        await pb.collections.create({
            name: 'apps',
            type: 'base',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'url', type: 'url', required: true },
                { name: 'icon', type: 'file', required: false }, // We will use this for uploaded files
                { name: 'iconUrl', type: 'text', required: false }, // For external URLs or CDN icons
                { name: 'order', type: 'number', required: false },
                { name: 'type', type: 'select', options: { values: ['app', 'bookmark'] }, maxSelect: 1 },
                { name: 'section', type: 'relation', collectionId: 'sections', cascadeDelete: false, maxSelect: 1 }
            ],
            listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
        });
    }
}

async function migrate() {
    try {
        console.log('Authenticating with PocketBase...');
        await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
        console.log('Authenticated.');

        await createCollections();

        console.log('Fetching data from SQLite...');
        const sections = await Section.findAll({ include: [{ model: AppItem, as: 'AppItems' }] });
        const bookmarks = await AppItem.findAll({ where: { type: 'bookmark' } });

        console.log(`Found ${sections.length} sections and ${bookmarks.length} bookmarks.`);

        // Migrate Sections
        for (const sec of sections) {
            console.log(`Migrating Section: ${sec.title}`);
            const pbSection = await pb.collection('sections').create({
                title: sec.title,
                order: sec.order
            });

            // Migrate Apps in Section
            if (sec.AppItems && sec.AppItems.length > 0) {
                for (const app of sec.AppItems) {
                    await migrateApp(app, pbSection.id);
                }
            }
        }

        // Migrate Bookmarks (Apps without section, type='bookmark')
        for (const bkm of bookmarks) {
            await migrateApp(bkm, null);
        }

        console.log('Migration Complete!');

    } catch (err) {
        console.error('Migration failed:', err);
    }
}

async function migrateApp(app, sectionId) {
    console.log(` - Migrating App: ${app.name} (${app.type})`);
    
    const data = {
        name: app.name,
        url: app.url,
        order: app.order,
        type: app.type,
        section: sectionId,
        iconUrl: ''
    };

    // Handle Icon
    let formData = null;
    
    if (app.icon) {
        if (app.icon.startsWith('/uploads/')) {
            // It's a local file, we need to upload it to PB
            const relativePath = app.icon;
            const fullPath = path.join(__dirname, '..', 'app_data', relativePath.replace('/', path.sep)); // fix slashes
            
            if (fs.existsSync(fullPath)) {
                // Prepare upload
                // NOTE: PocketBase JS SDK handles File/Blob/Buffer in Node env via 'form-data' automatically if passed as object? 
                // Or we construct FormData manually if using 'pocketbase' package in Node.
                // The 'pocketbase' package detects Node and expects FormData or similar.
                // Actually in recent versions you just pass a Blob or File compatible object.
                // But simplest is using `formData`.
                
                // Let's rely on simple update logic if create supports it.
                // We'll add it to payload.
                data.icon =  new Blob([fs.readFileSync(fullPath)]); // This might fail in old Node unless global Blob exists.
                // Alternative:
                // PB SDK in Node supports 'form-data' package streams.
                // const fileStream = fs.createReadStream(fullPath);
                // formData = new FormData();
                // append fields...
                
                // Let's try constructing the Record first, then updating with file if simpler, OR use create with FormData.
            } else {
                console.warn(`Original icon file missing: ${fullPath}`);
            }
        } else {
            // It's a URL or CDN link
            data.iconUrl = app.icon;
        }
    }

    // Creating record
    try {
        // If we have a file, we MUST use FormData to send everything, or SDK helper.
        // SDK helper: `pb.collection('apps').create({ ...data, icon: fileStream })`
        // Let's check if the file is local loop logic again.
        
        if (app.icon && app.icon.startsWith('/uploads/') && fs.existsSync(path.join(__dirname, '..', 'app_data', app.icon))) {
             const fullPath = path.join(__dirname, '..', 'app_data', app.icon);
             // Use FormData
             const fd = new FormData();
             for (const [key, value] of Object.entries(data)) {
                 if (value !== null && value !== undefined) fd.append(key, value);
             }
             fd.append('icon', fs.createReadStream(fullPath));
             await pb.collection('apps').create(fd);
        } else {
            // JSON create
            await pb.collection('apps').create(data);
        }
    } catch (e) {
        console.error(`Failed to migrate app ${app.name}:`, e.response?.data || e.message);
    }
}

migrate();
