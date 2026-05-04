/**
 * server.js - Node.js frontend server & API bridge
 * Serves UI on port 4001, proxies download operations to Python on port 4002
 */

'use strict';

const express    = require('express');
const http       = require('http');
const path       = require('path');
const { Server } = require('socket.io');

const backendConnection = require('./backendconnection');
const downloading       = require('./downloading');
const progress          = require('./progress');
const network           = require('./network');
const processing        = require('./processing');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] }
});

const PORT_UI     = 4001;
const PORT_PYTHON = 4002;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));  // serve index.html, styles.css

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const pyHealth = await backendConnection.checkPython(PORT_PYTHON);
  res.json({ node: 'ok', python: pyHealth, timestamp: Date.now() });
});

// ─── Media Info ────────────────────────────────────────────────────────────────
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const validated = network.validateUrl(url);
  if (!validated.valid) return res.status(400).json({ error: validated.reason });

  const result = await backendConnection.proxyPost(PORT_PYTHON, '/info', { url });
  res.status(result.ok ? 200 : 422).json(result.data);
});

// ─── Available Formats ─────────────────────────────────────────────────────────
app.post('/api/formats', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const result = await backendConnection.proxyPost(PORT_PYTHON, '/formats', { url });
  res.status(result.ok ? 200 : 422).json(result.data);
});

// ─── Start Download ────────────────────────────────────────────────────────────
app.post('/api/download', async (req, res) => {
  const { url, type, quality, format, fps } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const validated = network.validateUrl(url);
  if (!validated.valid) return res.status(400).json({ error: validated.reason });

  const id = downloading.generateId();
  downloading.register(id, { url, type, quality, format, fps, started: Date.now() });

  const payload = { url, type: type || 'video', quality: quality || '720p',
                    format: format || 'mp4', fps: fps || '30fps', id };

  const result = await backendConnection.proxyPost(PORT_PYTHON, '/download', payload);
  if (!result.ok) {
    downloading.setFailed(id, result.data?.error || 'Failed to start');
    return res.status(500).json(result.data);
  }

  res.json({ id, status: 'started' });
});

// ─── Bulk Download ────────────────────────────────────────────────────────────
app.post('/api/download/bulk', async (req, res) => {
  const { text, type, quality, format, fps } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const payload = { text, type: type || 'video', quality: quality || '720p',
                    format: format || 'mp4', fps: fps || '30fps' };

  const result = await backendConnection.proxyPost(PORT_PYTHON, '/download/bulk', payload);
  if (!result.ok) {
    return res.status(500).json(result.data);
  }

  // Register all generated ids locally in Node
  if (result.data && result.data.downloads) {
    for (const d of result.data.downloads) {
      downloading.register(d.id, { url: d.url, type, quality, format, fps, started: Date.now() });
    }
  }

  res.json(result.data);
});

// ─── Progress ──────────────────────────────────────────────────────────────────
app.get('/api/progress/:id', async (req, res) => {
  const { id } = req.params;
  const result = await backendConnection.proxyGet(PORT_PYTHON, `/progress/${id}`);
  res.status(result.ok ? 200 : 404).json(result.data);
});

app.get('/api/progress', async (req, res) => {
  const result = await backendConnection.proxyGet(PORT_PYTHON, '/progress');
  res.json(result.ok ? result.data : {});
});

// ─── Cancel ────────────────────────────────────────────────────────────────────
app.post('/api/cancel/:id', async (req, res) => {
  const { id } = req.params;
  await backendConnection.proxyPost(PORT_PYTHON, `/cancel/${id}`, {});
  downloading.setFailed(id, 'Cancelled by user');
  res.json({ id, status: 'cancelled' });
});

app.post('/api/cancel-all', async (req, res) => {
  await backendConnection.proxyPost(PORT_PYTHON, '/cancel-all', {});
  downloading.cancelAll();
  res.json({ status: 'all_cancelled' });
});

// ─── Clear ─────────────────────────────────────────────────────────────────────
app.delete('/api/clear/:id', async (req, res) => {
  const { id } = req.params;
  await backendConnection.proxyDelete(PORT_PYTHON, `/clear/${id}`);
  downloading.remove(id);
  res.json({ id, removed: true });
});

// ─── Platform info ─────────────────────────────────────────────────────────────
app.get('/api/platform', async (req, res) => {
  const result = await backendConnection.proxyGet(PORT_PYTHON, '/platform');
  res.json(result.ok ? result.data : { error: 'Python engine unavailable' });
});

// ─── Catch-all → index.html ────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── WebSocket progress broadcasting ──────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  socket.on('subscribe', (id) => {
    socket.join(`dl:${id}`);
  });

  socket.on('unsubscribe', (id) => {
    socket.leave(`dl:${id}`);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Poll Python for progress and broadcast via Socket.IO
progress.startPolling(PORT_PYTHON, io, 500);

// ─── Start server ──────────────────────────────────────────────────────────────
server.listen(PORT_UI, '0.0.0.0', async () => {
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║       CYPHER DOWNLOADER v1.0          ║`);
  console.log(`╚═══════════════════════════════════════╝`);
  console.log(`  UI Server  : http://0.0.0.0:${PORT_UI}`);
  console.log(`  Python API : http://0.0.0.0:${PORT_PYTHON}`);
  console.log(`  Access at  : http://localhost:${PORT_UI}\n`);

  // Wait for Python engine
  await backendConnection.waitForPython(PORT_PYTHON, 30);
});

process.on('SIGINT',  () => { console.log('\n[Node] Shutting down...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n[Node] Shutting down...'); process.exit(0); });

module.exports = { app, io };