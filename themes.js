/**
 * themes.js - Theme management for Cypher Downloader
 * Themes: Kuromi, Cyberpunk 2077, PlayStation 4, Elden Ring (each with light/dark)
 */

'use strict';

const THEMES = {
  'kuromi-dark': {
    '--bg-primary':    '#0d0010',
    '--bg-secondary':  '#1a0020',
    '--bg-card':       '#1f0028',
    '--bg-input':      '#2a0035',
    '--accent-1':      '#c77dff',
    '--accent-2':      '#e040fb',
    '--accent-3':      '#ff80ab',
    '--text-primary':  '#f0d6ff',
    '--text-secondary':'#c9a7e8',
    '--text-muted':    '#8c6ba0',
    '--border':        '#4a1060',
    '--border-bright': '#9c27b0',
    '--success':       '#a5d6a7',
    '--error':         '#ff8a80',
    '--warning':       '#ffcc02',
    '--progress-glow': '#c77dff',
    '--font-display':  "'Fredoka One', cursive",
    '--font-body':     "'Nunito', sans-serif",
  },
  'kuromi-light': {
    '--bg-primary':    '#f3e6ff',
    '--bg-secondary':  '#ead4ff',
    '--bg-card':       '#fff0ff',
    '--bg-input':      '#fce4ff',
    '--accent-1':      '#9c27b0',
    '--accent-2':      '#e040fb',
    '--accent-3':      '#f06292',
    '--text-primary':  '#1a0020',
    '--text-secondary':'#4a1060',
    '--text-muted':    '#7b3fa0',
    '--border':        '#d4a0f0',
    '--border-bright': '#9c27b0',
    '--success':       '#2e7d32',
    '--error':         '#c62828',
    '--warning':       '#f57f17',
    '--progress-glow': '#9c27b0',
    '--font-display':  "'Fredoka One', cursive",
    '--font-body':     "'Nunito', sans-serif",
  },
  'cyberpunk-dark': {
    '--bg-primary':    '#070010',
    '--bg-secondary':  '#0d0018',
    '--bg-card':       '#0f001f',
    '--bg-input':      '#150025',
    '--accent-1':      '#00ffff',
    '--accent-2':      '#ff006e',
    '--accent-3':      '#ffe600',
    '--text-primary':  '#e0f7fa',
    '--text-secondary':'#80deea',
    '--text-muted':    '#4dd0e1',
    '--border':        '#003340',
    '--border-bright': '#00ffff',
    '--success':       '#00e676',
    '--error':         '#ff1744',
    '--warning':       '#ffe600',
    '--progress-glow': '#00ffff',
    '--font-display':  "'Orbitron', monospace",
    '--font-body':     "'Share Tech Mono', monospace",
  },
  'cyberpunk-light': {
    '--bg-primary':    '#e8fff9',
    '--bg-secondary':  '#d0fff5',
    '--bg-card':       '#f0fffe',
    '--bg-input':      '#ccfff7',
    '--accent-1':      '#006064',
    '--accent-2':      '#c2185b',
    '--accent-3':      '#f57f17',
    '--text-primary':  '#00251a',
    '--text-secondary':'#004d40',
    '--text-muted':    '#00695c',
    '--border':        '#80cbc4',
    '--border-bright': '#006064',
    '--success':       '#2e7d32',
    '--error':         '#c62828',
    '--warning':       '#f57f17',
    '--progress-glow': '#006064',
    '--font-display':  "'Orbitron', monospace",
    '--font-body':     "'Share Tech Mono', monospace",
  },
  'ps4-dark': {
    '--bg-primary':    '#000810',
    '--bg-secondary':  '#001020',
    '--bg-card':       '#001428',
    '--bg-input':      '#001c34',
    '--accent-1':      '#00439c',
    '--accent-2':      '#0070d1',
    '--accent-3':      '#003087',
    '--text-primary':  '#e8f4ff',
    '--text-secondary':'#90caf9',
    '--text-muted':    '#5c9fd4',
    '--border':        '#002850',
    '--border-bright': '#0070d1',
    '--success':       '#69f0ae',
    '--error':         '#ff5252',
    '--warning':       '#ffd740',
    '--progress-glow': '#0070d1',
    '--font-display':  "'Rajdhani', sans-serif",
    '--font-body':     "'Source Sans 3', sans-serif",
  },
  'ps4-light': {
    '--bg-primary':    '#e3f0ff',
    '--bg-secondary':  '#d0e8ff',
    '--bg-card':       '#f0f7ff',
    '--bg-input':      '#c8e0ff',
    '--accent-1':      '#00439c',
    '--accent-2':      '#0070d1',
    '--accent-3':      '#003087',
    '--text-primary':  '#000c1e',
    '--text-secondary':'#0d2b5e',
    '--text-muted':    '#1a4a8a',
    '--border':        '#8ab4e8',
    '--border-bright': '#0070d1',
    '--success':       '#1b5e20',
    '--error':         '#b71c1c',
    '--warning':       '#e65100',
    '--progress-glow': '#0070d1',
    '--font-display':  "'Rajdhani', sans-serif",
    '--font-body':     "'Source Sans 3', sans-serif",
  },
  'eldenring-dark': {
    '--bg-primary':    '#0a0800',
    '--bg-secondary':  '#120e00',
    '--bg-card':       '#1a1200',
    '--bg-input':      '#201800',
    '--accent-1':      '#c9a84c',
    '--accent-2':      '#e8c96e',
    '--accent-3':      '#8b6914',
    '--text-primary':  '#f5e8c0',
    '--text-secondary':'#d4b870',
    '--text-muted':    '#9a7a40',
    '--border':        '#3a2a00',
    '--border-bright': '#c9a84c',
    '--success':       '#81c784',
    '--error':         '#ef9a9a',
    '--warning':       '#ffcc02',
    '--progress-glow': '#c9a84c',
    '--font-display':  "'Cinzel', serif",
    '--font-body':     "'EB Garamond', serif",
  },
  'eldenring-light': {
    '--bg-primary':    '#fdf6e3',
    '--bg-secondary':  '#f8edd0',
    '--bg-card':       '#fffcf0',
    '--bg-input':      '#f5eacc',
    '--accent-1':      '#7a5c00',
    '--accent-2':      '#c9a84c',
    '--accent-3':      '#5c3d00',
    '--text-primary':  '#1a0e00',
    '--text-secondary':'#4a3000',
    '--text-muted':    '#7a5c00',
    '--border':        '#d4b870',
    '--border-bright': '#c9a84c',
    '--success':       '#2e7d32',
    '--error':         '#c62828',
    '--warning':       '#e65100',
    '--progress-glow': '#c9a84c',
    '--font-display':  "'Cinzel', serif",
    '--font-body':     "'EB Garamond', serif",
  },
};

const GOOGLE_FONTS = {
  'kuromi':    'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700&display=swap',
  'cyberpunk': 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap',
  'ps4':       'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap',
  'eldenring': 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=EB+Garamond:wght@400;600&display=swap',
};

let _currentTheme = 'cyberpunk-dark';
let _fontLink = null;

function applyTheme(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;

  _currentTheme = themeKey;
  const root = document.documentElement;

  for (const [prop, val] of Object.entries(theme)) {
    root.style.setProperty(prop, val);
  }

  // Load Google Fonts
  const base = themeKey.split('-')[0];
  const fontUrl = GOOGLE_FONTS[base];
  if (fontUrl) {
    if (!_fontLink) {
      _fontLink = document.createElement('link');
      _fontLink.rel = 'stylesheet';
      document.head.appendChild(_fontLink);
    }
    _fontLink.href = fontUrl;
  }

  // Set font family variables on body
  if (theme['--font-display']) {
    root.style.setProperty('--font-display', theme['--font-display']);
    root.style.setProperty('--font-body', theme['--font-body']);
  }

  // Update active state on theme buttons
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeKey);
  });

  localStorage.setItem('cypher-theme', themeKey);
}

function toggleDark() {
  const [base, mode] = _currentTheme.split('-');
  const newMode = mode === 'dark' ? 'light' : 'dark';
  applyTheme(`${base}-${newMode}`);

  const btn = document.getElementById('darkToggle');
  if (btn) btn.textContent = newMode === 'dark' ? '☀' : '☽';
}

function getAvailableThemes() {
  return Object.keys(THEMES);
}

function getCurrentTheme() {
  return _currentTheme;
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved theme or default
  const saved = localStorage.getItem('cypher-theme') || 'cyberpunk-dark';
  applyTheme(saved);

  // Bind theme buttons
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  // Bind dark toggle
  const darkBtn = document.getElementById('darkToggle');
  if (darkBtn) darkBtn.addEventListener('click', toggleDark);

  // Update toggle icon
  const [, mode] = saved.split('-');
  if (darkBtn) darkBtn.textContent = mode === 'dark' ? '☀' : '☽';
});

window.applyTheme  = applyTheme;
window.toggleDark  = toggleDark;