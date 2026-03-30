/**
 * processing.js - Node-side processing helpers.
 * Utility functions for request/response normalization and data shaping.
 */

'use strict';

/**
 * Normalize quality string to a consistent format.
 */
function normalizeQuality(quality) {
  if (!quality) return '720p';
  const q = String(quality).toLowerCase().trim();
  const valid = ['360p', '480p', '720p', '1080p', '2k', '4k', '120kbps', '320kbps'];
  return valid.includes(q) ? q : '720p';
}

/**
 * Normalize format string.
 */
function normalizeFormat(format, type = 'video') {
  const f = String(format || '').toLowerCase().trim();
  if (type === 'audio') {
    return ['mp3', 'wav', 'flac'].includes(f) ? f : 'mp3';
  }
  return ['mp4', 'mkv', 'webm'].includes(f) ? f : 'mp4';
}

/**
 * Normalize fps string.
 */
function normalizeFps(fps) {
  return ['30fps', '60fps'].includes(fps) ? fps : '30fps';
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Build a normalized download request payload.
 */
function buildDownloadPayload({ url, type, quality, format, fps, id }) {
  const mediaType = ['video', 'audio', 'playlist'].includes(type) ? type : 'video';

  return {
    id,
    url: String(url || '').trim(),
    type: mediaType,
    quality: normalizeQuality(quality),
    format: normalizeFormat(format, mediaType),
    fps: normalizeFps(fps),
  };
}

/**
 * Sanitize progress data from Python for client consumption.
 */
function sanitizeProgress(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id:         raw.id         || '',
    status:     raw.status     || 'unknown',
    progress:   Number(raw.progress)   || 0,
    speed:      raw.speed      || '0 KB/s',
    eta:        raw.eta        || '--',
    downloaded: Number(raw.downloaded) || 0,
    total:      Number(raw.total)      || 0,
    remaining:  Number(raw.remaining)  || 0,
    file:       raw.file       || null,
    error:      raw.error      || null,
    attempt:    raw.attempt    || 1,
  };
}

module.exports = {
  normalizeQuality,
  normalizeFormat,
  normalizeFps,
  formatBytes,
  buildDownloadPayload,
  sanitizeProgress,
};