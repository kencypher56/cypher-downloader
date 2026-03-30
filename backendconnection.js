/**
 * backendconnection.js - Node.js <-> Python bridge
 * All HTTP calls from Node to the Python engine go through here.
 */

'use strict';

const http = require('http');

const TIMEOUT_MS = 60000; // 60s default

/**
 * Generic HTTP request to Python backend.
 * Returns { ok: bool, data: object }
 */
async function request(port, method, path, body = null) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data, status: res.statusCode });
        } catch {
          resolve({ ok: false, data: { error: 'Invalid JSON from Python engine', raw }, status: res.statusCode });
        }
      });
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      resolve({ ok: false, data: { error: 'Request timed out' }, status: 0 });
    });

    req.on('error', (err) => {
      resolve({ ok: false, data: { error: err.message }, status: 0 });
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const proxyGet    = (port, path)        => request(port, 'GET',    path);
const proxyPost   = (port, path, body)  => request(port, 'POST',   path, body);
const proxyDelete = (port, path)        => request(port, 'DELETE', path);

/**
 * Check if Python engine is alive.
 */
async function checkPython(port) {
  const result = await proxyGet(port, '/health');
  return result.ok ? 'ok' : 'unavailable';
}

/**
 * Block until Python is available (or timeout).
 * @param {number} port
 * @param {number} maxWaitSeconds
 */
async function waitForPython(port, maxWaitSeconds = 30) {
  const start = Date.now();
  let attempts = 0;

  while ((Date.now() - start) < maxWaitSeconds * 1000) {
    const result = await proxyGet(port, '/health');
    if (result.ok) {
      console.log(`[Bridge] Python engine ready after ${attempts} attempts`);
      return true;
    }
    attempts++;
    await new Promise(r => setTimeout(r, 1000));
  }

  console.warn(`[Bridge] Python engine not available after ${maxWaitSeconds}s - continuing anyway`);
  return false;
}

module.exports = { proxyGet, proxyPost, proxyDelete, checkPython, waitForPython };