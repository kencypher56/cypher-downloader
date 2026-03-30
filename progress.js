/**
 * progress.js - Polls Python engine for progress and broadcasts via Socket.IO.
 */

'use strict';

const backendConnection = require('./backendconnection');

let _pollInterval = null;
let _io = null;
let _port = 4002;

// Track last known state to avoid redundant broadcasts
const _lastState = {};

/**
 * Start polling Python engine at given interval (ms) and broadcasting via io.
 */
function startPolling(port, io, intervalMs = 500) {
  _port = port;
  _io   = io;

  if (_pollInterval) clearInterval(_pollInterval);

  _pollInterval = setInterval(async () => {
    await _poll();
  }, intervalMs);

  console.log(`[Progress] Polling Python every ${intervalMs}ms`);
}

async function _poll() {
  if (!_io) return;

  const result = await backendConnection.proxyGet(_port, '/progress');
  if (!result.ok || !result.data) return;

  const allProgress = result.data;

  for (const [id, info] of Object.entries(allProgress)) {
    const last = _lastState[id];
    const changed = !last
      || last.progress  !== info.progress
      || last.status    !== info.status
      || last.speed     !== info.speed
      || last.downloaded !== info.downloaded;

    if (changed) {
      _lastState[id] = { ...info };

      // Broadcast to room for this specific download
      _io.to(`dl:${id}`).emit('progress', info);

      // Also broadcast to global room for the "all downloads" view
      _io.emit('progress_update', info);

      // Cleanup completed state from local cache after a delay
      if (['completed', 'error', 'cancelled'].includes(info.status)) {
        setTimeout(() => { delete _lastState[id]; }, 60000);
      }
    }
  }
}

/**
 * Stop polling.
 */
function stopPolling() {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}

module.exports = { startPolling, stopPolling };