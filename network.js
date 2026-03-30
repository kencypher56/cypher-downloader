/**
 * network.js - URL validation and platform detection utilities.
 */

'use strict';

const SUPPORTED_PLATFORMS = {
  youtube:   /(?:youtube\.com|youtu\.be)/i,
  instagram: /instagram\.com/i,
  facebook:  /(?:facebook\.com|fb\.watch)/i,
  tiktok:    /tiktok\.com/i,
  twitter:   /(?:twitter\.com|x\.com)/i,
  twitch:    /twitch\.tv/i,
  vimeo:     /vimeo\.com/i,
  reddit:    /reddit\.com/i,
  dailymotion: /dailymotion\.com/i,
};

const DIRECT_VIDEO_EXTS = /\.(mp4|mkv|webm|mov|avi|flv|m4v|ts|m3u8)(\?.*)?$/i;

/**
 * Validate and categorize a URL.
 * @returns { valid: bool, reason: string, platform: string, isPlaylist: bool, isDirect: bool }
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'URL is required' };
  }

  const trimmed = url.trim();

  // Basic URL format check
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Must be http or https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, reason: 'URL must use HTTP or HTTPS' };
  }

  // Detect platform
  let platform = 'generic';
  for (const [name, pattern] of Object.entries(SUPPORTED_PLATFORMS)) {
    if (pattern.test(trimmed)) {
      platform = name;
      break;
    }
  }

  // Detect if direct video link
  const isDirect = DIRECT_VIDEO_EXTS.test(parsed.pathname) || DIRECT_VIDEO_EXTS.test(trimmed);

  // Detect playlist
  const isPlaylist = (
    (platform === 'youtube' && (trimmed.includes('list=') || trimmed.includes('/playlist'))) ||
    (platform === 'tiktok'  && trimmed.includes('/@') && trimmed.endsWith('/video') === false)
  );

  return { valid: true, reason: null, platform, isPlaylist, isDirect, url: trimmed };
}

/**
 * Detect platform name for display.
 */
function detectPlatform(url) {
  const result = validateUrl(url);
  return result.platform || 'generic';
}

/**
 * Check if a URL looks like a playlist.
 */
function isPlaylistUrl(url) {
  return validateUrl(url).isPlaylist === true;
}

/**
 * Sanitize URL (trim whitespace, handle common typos).
 */
function sanitizeUrl(url) {
  if (!url) return '';
  let u = url.trim();
  // Auto-prepend https:// if missing
  if (u && !u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'https://' + u;
  }
  return u;
}

module.exports = { validateUrl, detectPlatform, isPlaylistUrl, sanitizeUrl, SUPPORTED_PLATFORMS };