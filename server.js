const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
require('dotenv').config();


const db = require('./db/index');
const leadsRouter = require('./api/leads');
const campaignsRouter = require('./api/campaigns');
const apikeysRouter = require('./api/apikeys');
const settingsRouter = require('./api/settings');
const chatRouter = require('./api/chat');
const schedulesRouter = require('./api/schedules');

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '30m', etag: true }));

const apiLimiter = rateLimit({ windowMs: 60000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter);

app.use('/api/leads', leadsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/apikeys', apikeysRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/schedules', schedulesRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Campaigns geo-stats endpoint
app.get('/api/geo-stats', (req, res) => {
    try {
        const { location } = req.query;
        if (!location) return res.json({ leadsCount: 0, campaignCount: 0, hitRate: 0 });
        const loc = location.split(',')[0].trim().toLowerCase();
        const leadsCount = db.prepare("SELECT COUNT(*) as c FROM leads WHERE LOWER(address) LIKE ?").get(`%${loc}%`)?.c || 0;
        const totalCamps = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE LOWER(location) LIKE ?").get(`%${loc}%`)?.c || 0;
        const successCamps = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE LOWER(location) LIKE ? AND status='completed'").get(`%${loc}%`)?.c || 0;
        const hitRate = totalCamps > 0 ? Math.round((successCamps / totalCamps) * 100) : 0;
        res.json({ leadsCount, campaignCount: totalCamps, hitRate });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard-main.html')));

app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });

    // Attempt to serve HTML file directly if it exists
    const safePath = req.path.replace(/[^a-zA-Z0-9-]/g, '');
    const possibleFile = path.join(__dirname, 'public', `${safePath}.html`);

    require('fs').access(possibleFile, require('fs').constants.F_OK, (err) => {
        if (!err) {
            res.sendFile(possibleFile);
        } else {
            res.sendFile(path.join(__dirname, 'public', 'dashboard-main.html'));
        }
    });
});
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ── Scheduler ──────────────────────────────────────────
function runScheduler() {
    try {
        const now = new Date();
        const due = db.prepare("SELECT * FROM schedules WHERE status='active' AND next_run IS NOT NULL AND next_run <= ?").all(now.toISOString());
        for (const sched of due) {
            console.log(`[scheduler] Firing: ${sched.name}`);
            triggerScheduledRun(sched).catch(console.error);

            // Compute next_run
            let nextRun = null;
            if (sched.frequency === 'daily') {
                const next = new Date(sched.run_at || now);
                next.setDate(next.getDate() + 1);
                nextRun = next.toISOString();
            } else if (sched.frequency === 'weekly') {
                const next = new Date(sched.run_at || now);
                next.setDate(next.getDate() + 7);
                nextRun = next.toISOString();
            }
            db.prepare("UPDATE schedules SET last_run=?, next_run=?, status=? WHERE id=?")
                .run(now.toISOString(), nextRun, nextRun ? 'active' : 'completed', sched.id);
        }
    } catch (e) { console.error('[scheduler] error:', e.message); }
}

async function triggerScheduledRun(sched) {
    const port = server._port || 3001;
    await fetch(`http://localhost:${port}/api/leads/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            location: sched.location,
            businessType: sched.business_type,
            leadType: sched.lead_type,
            maxLeads: sched.lead_count
        })
    });
}

setInterval(runScheduler, 60000); // check every minute

// ── Auto port ──────────────────────────────────────────
const PORTS = [3001, 3002, 3003, 3004, 3005];
let portIndex = 0;
let server;

function startServer() {
    if (portIndex >= PORTS.length) { console.error('All ports occupied.'); process.exit(1); }
    const port = PORTS[portIndex];
    server = app.listen(port, () => {
        server._port = port;
        console.log(`\n✅ Atelier CRM → http://localhost:${port}`);
        console.log(`   Dashboard:   http://localhost:${port}/dashboard.html\n`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') { portIndex++; startServer(); }
        else console.error(err);
    });
}
startServer();
