/**
 * downloading.js - Download registry and ID management on the Node side.
 * Tracks active downloads, generates unique IDs, manages state.
 */

'use strict';

const { randomBytes } = require('crypto');

// In-memory registry: id -> metadata
const _registry = new Map();

/**
 * Generate a unique download ID.
 */
function generateId() {
  return `dl_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

/**
 * Register a new download.
 */
function register(id, meta = {}) {
  _registry.set(id, {
    id,
    ...meta,
    status: 'queued',
    createdAt: Date.now(),
  });
}

/**
 * Mark a download as failed.
 */
function setFailed(id, error) {
  const entry = _registry.get(id);
  if (entry) {
    entry.status = 'error';
    entry.error  = error;
    entry.endedAt = Date.now();
    _registry.set(id, entry);
  }
}

/**
 * Remove a download from registry.
 */
function remove(id) {
  _registry.delete(id);
}

/**
 * Cancel all active downloads.
 */
function cancelAll() {
  for (const [id, entry] of _registry.entries()) {
    if (!['completed', 'error', 'cancelled'].includes(entry.status)) {
      entry.status = 'cancelled';
      entry.endedAt = Date.now();
      _registry.set(id, entry);
    }
  }
}

/**
 * Get all downloads.
 */
function getAll() {
  return Object.fromEntries(_registry);
}

/**
 * Get a single download by ID.
 */
function get(id) {
  return _registry.get(id) || null;
}

/**
 * Get count of active downloads.
 */
function activeCount() {
  let n = 0;
  for (const entry of _registry.values()) {
    if (['queued', 'downloading', 'processing', 'starting'].includes(entry.status)) n++;
  }
  return n;
}

/**
 * Clean up old completed/failed downloads (older than maxAgeMs).
 */
function cleanup(maxAgeMs = 3600000) {
  const now = Date.now();
  for (const [id, entry] of _registry.entries()) {
    if (['completed', 'error', 'cancelled'].includes(entry.status)) {
      if (entry.endedAt && (now - entry.endedAt) > maxAgeMs) {
        _registry.delete(id);
      }
    }
  }
}

// Auto-cleanup every 30 minutes
setInterval(() => cleanup(), 1800000);

module.exports = { generateId, register, setFailed, remove, cancelAll, getAll, get, activeCount };