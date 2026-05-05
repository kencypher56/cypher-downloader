/**
 * ui.js - Frontend UI logic
 * Handles all user interactions, API calls, download queue, and DOM updates.
 */

'use strict';

// ─── State ─────────────────────────────────────────────────────────────────────
const State = {
  downloads: {},       // id -> download info
  socket: null,
  mediaInfo: null,
  currentUrl: '',
  platform: null,
  isLoading: false,
  activeTab: 'video',  // 'video' | 'audio' | 'playlist'
};

// ─── Socket.IO ─────────────────────────────────────────────────────────────────
function initSocket() {
  // io() is provided by Socket.IO CDN
  try {
    State.socket = io();

    State.socket.on('connect', () => {
      console.log('[WS] Connected:', State.socket.id);
      UI.setStatus('connected');
    });

    State.socket.on('disconnect', () => {
      UI.setStatus('disconnected');
    });

    State.socket.on('progress_update', (data) => {
      handleProgressUpdate(data);
    });

    State.socket.on('progress', (data) => {
      handleProgressUpdate(data);
    });
  } catch (e) {
    console.warn('[WS] Socket.IO not available, falling back to polling');
    startPolling();
  }
}

function startPolling() {
  setInterval(async () => {
    const active = Object.keys(State.downloads).filter(id => {
      const d = State.downloads[id];
      return d && !['completed', 'error', 'cancelled'].includes(d.status);
    });
    if (!active.length) return;

    try {
      const res = await fetch('/api/progress');
      if (res.ok) {
        const all = await res.json();
        for (const [id, info] of Object.entries(all)) {
          handleProgressUpdate(info);
        }
      }
    } catch (e) {}
  }, 600);
}

// ─── API helpers ───────────────────────────────────────────────────────────────
async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function apiGet(path) {
  const res = await fetch(path);
  const data = await res.json();
  return { ok: res.ok, data };
}

async function apiDelete(path) {
  const res = await fetch(path, { method: 'DELETE' });
  const data = await res.json();
  return { ok: res.ok, data };
}

// ─── Fetch Media Info ──────────────────────────────────────────────────────────
async function fetchInfo(url) {
  if (!url) return;
  State.currentUrl = url;
  UI.showInfoLoading(true);
  UI.clearInfo();

  try {
    const { ok, data } = await apiPost('/api/info', { url });
    if (ok && !data.error) {
      State.mediaInfo = data;
      UI.renderMediaInfo(data);
      UI.updateOptions(data);
    } else {
      UI.showError(data.error || 'Could not fetch media info');
    }
  } catch (e) {
    UI.showError('Network error: ' + e.message);
  } finally {
    UI.showInfoLoading(false);
  }
}

// ─── Start Download ────────────────────────────────────────────────────────────
async function startDownload() {
  const type    = State.activeTab;
  if (type === 'bulk') {
    return startBulkDownload();
  }

  const url = document.getElementById('urlInput')?.value?.trim();
  if (!url) return UI.showError('Please enter a URL');

  const quality = getSelectedQuality(type);
  const format  = getSelectedFormat(type);
  const fps     = getSelectedFps();

  UI.setDownloadBtnLoading(true);

  try {
    const { ok, data } = await apiPost('/api/download', { url, type, quality, format, fps });
    if (ok && data.id) {
      State.downloads[data.id] = {
        id: data.id, url, type, quality, format, fps,
        status: 'starting', progress: 0,
        title: State.mediaInfo?.title || url,
        thumbnail: State.mediaInfo?.thumbnail || '',
      };

      if (State.socket) State.socket.emit('subscribe', data.id);
      UI.addDownloadCard(data.id, State.downloads[data.id]);
    } else {
      UI.showError(data.error || 'Failed to start download');
    }
  } catch (e) {
    UI.showError('Failed to start: ' + e.message);
  } finally {
    UI.setDownloadBtnLoading(false);
  }
}

async function startBulkDownload() {
  const fileInput = document.getElementById('bulkUploadInput');
  const file = fileInput.files[0];
  if (!file) return UI.showError('Please select a text file first');

  const bulkType = document.querySelector('[data-group="bulktype"].active')?.dataset?.value || 'video';
  const quality = bulkType === 'audio' 
    ? (document.querySelector('[data-group="bulkbitrate"].active')?.dataset?.value || '320kbps')
    : (document.querySelector('[data-group="bulkquality"].active')?.dataset?.value || '720p');
  const format = bulkType === 'audio'
    ? (document.querySelector('[data-group="bulkaudioformat"].active')?.dataset?.value || 'mp3')
    : (document.querySelector('[data-group="bulkformat"].active')?.dataset?.value || 'mp4');
  const fps = bulkType === 'video' ? (document.querySelector('[data-group="fps"].active')?.dataset?.value || '30fps') : null;

  const text = await file.text();

  UI.setDownloadBtnLoading(true);
  try {
    const payload = { text, type: bulkType, quality, format };
    if (fps) payload.fps = fps;  // Only send fps for video
    const { ok, data } = await apiPost('/api/download/bulk', payload);
    
    if (ok && data.downloads) {
      for (const d of data.downloads) {
        const downloadInfo = {
          id: d.id, url: d.url, type: bulkType, quality, format,
          status: 'starting', progress: 0,
          title: d.url,
          thumbnail: '',
        };
        if (fps) downloadInfo.fps = fps;  // Include fps only for video
        State.downloads[d.id] = downloadInfo;
        if (State.socket) State.socket.emit('subscribe', d.id);
        UI.addDownloadCard(d.id, State.downloads[d.id]);
      }
      fileInput.value = '';
      const infoEl = document.getElementById('bulkUploadInfo');
      if (infoEl) infoEl.innerHTML = 'Upload a .txt file with one link per line';
      UI.showSuccess(`✓ Started ${data.downloads.length} download${data.downloads.length > 1 ? 's' : ''}`);
    } else {
      UI.showError(data.error || 'Failed to start bulk download');
    }
  } catch (e) {
    UI.showError('Error in bulk download: ' + e.message);
  } finally {
    UI.setDownloadBtnLoading(false);
  }
}

function toggleBulkType(type) {
  const vidFmt = document.getElementById('bulkVideoFormatGroup');
  const vidQual = document.getElementById('bulkVideoQualityGroup');
  const audFmt = document.getElementById('bulkAudioFormatGroup');
  const audBit = document.getElementById('bulkAudioBitrateGroup');
  if (type === 'video') {
    if (vidFmt) vidFmt.style.display = '';
    if (vidQual) vidQual.style.display = '';
    if (audFmt) audFmt.style.display = 'none';
    if (audBit) audBit.style.display = 'none';
  } else {
    if (vidFmt) vidFmt.style.display = 'none';
    if (vidQual) vidQual.style.display = 'none';
    if (audFmt) audFmt.style.display = '';
    if (audBit) audBit.style.display = '';
  }
}

function getSelectedQuality(type) {
  if (type === 'audio') {
    return document.querySelector('[data-group="bitrate"].active')?.dataset?.value || '320kbps';
  }
  return document.querySelector('[data-group="quality"].active')?.dataset?.value || '720p';
}

function getSelectedFormat(type) {
  if (type === 'audio') {
    return document.querySelector('[data-group="audioformat"].active')?.dataset?.value || 'mp3';
  }
  return document.querySelector('[data-group="format"].active')?.dataset?.value || 'mp4';
}

function getSelectedFps() {
  return document.querySelector('[data-group="fps"].active')?.dataset?.value || '30fps';
}

// ─── Progress Handling ─────────────────────────────────────────────────────────
function handleProgressUpdate(data) {
  if (!data?.id) return;

  const prev = State.downloads[data.id] || {};
  State.downloads[data.id] = { ...prev, ...data };
  UI.updateDownloadCard(data.id, State.downloads[data.id]);
}

async function cancelDownload(id) {
  try {
    await apiPost(`/api/cancel/${id}`, {});
    State.downloads[id] = { ...State.downloads[id], status: 'cancelled' };
    UI.updateDownloadCard(id, State.downloads[id]);
  } catch (e) {}
}

async function clearDownload(id) {
  try {
    await apiDelete(`/api/clear/${id}`);
  } catch (e) {}
  delete State.downloads[id];
  UI.removeDownloadCard(id);
}

async function cancelAll() {
  try { await apiPost('/api/cancel-all', {}); } catch(e) {}
  for (const id of Object.keys(State.downloads)) {
    State.downloads[id].status = 'cancelled';
    UI.updateDownloadCard(id, State.downloads[id]);
  }
}

// ─── UI Object ─────────────────────────────────────────────────────────────────
const UI = {
  setStatus(status) {
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (!dot) return;
    dot.className = `status-dot ${status}`;
    if (txt) txt.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
  },

  showInfoLoading(show) {
    const el = document.getElementById('infoLoader');
    if (el) el.style.display = show ? 'flex' : 'none';
  },

  clearInfo() {
    const el = document.getElementById('mediaInfoCard');
    if (el) el.innerHTML = '';
  },

  renderMediaInfo(info) {
    const el = document.getElementById('mediaInfoCard');
    if (!el) return;

    const thumb = info.thumbnail
      ? `<img src="${escHtml(info.thumbnail)}" alt="thumbnail" class="media-thumb" onerror="this.style.display='none'">`
      : `<div class="media-thumb-placeholder"><span class="icon-film"></span></div>`;

    el.innerHTML = `
      <div class="media-info-inner">
        <div class="media-thumb-wrap">${thumb}</div>
        <div class="media-details">
          <div class="media-title">${escHtml(info.title || 'Unknown')}</div>
          <div class="media-meta">
            <span class="meta-chip platform-chip">${escHtml(info.platform || '')}</span>
            <span class="meta-chip">${escHtml(info.duration || '')}</span>
            ${info.views ? `<span class="meta-chip">${fmtNum(info.views)} views</span>` : ''}
            ${info.is_playlist ? `<span class="meta-chip playlist-chip">Playlist · ${info.playlist_count} videos</span>` : ''}
          </div>
          <div class="media-uploader">${escHtml(info.uploader || '')}</div>
          ${info.description ? `<div class="media-desc">${escHtml(info.description)}</div>` : ''}
        </div>
      </div>
    `;
  },

  updateOptions(info) {
    // Update available resolutions
    const resButtons = document.querySelectorAll('[data-group="quality"]');
    const available = (info.resolutions || []).map(r => r.toLowerCase());
    resButtons.forEach(btn => {
      const val = btn.dataset.value?.toLowerCase();
      const avail = available.length === 0 || available.includes(val);
      btn.disabled = !avail;
      btn.title = avail ? '' : 'Not available for this video';
      if (!avail && btn.classList.contains('active')) {
        btn.classList.remove('active');
        // Activate first available
        const firstAvail = Array.from(resButtons).find(b => !b.disabled);
        if (firstAvail) firstAvail.classList.add('active');
      }
    });

    // Auto-switch to playlist tab
    if (info.is_playlist) {
      switchTab('playlist');
    }
  },

  showError(msg) {
    const el = document.getElementById('errorToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 5000);
  },

  showSuccess(msg) {
    const el = document.getElementById('errorToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible', 'success');
    setTimeout(() => el.classList.remove('visible', 'success'), 4000);
  },

  setDownloadBtnLoading(loading) {
    const btn = document.getElementById('downloadBtn');
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
    btn.textContent = loading ? 'Starting...' : 'Download';
  },

  addDownloadCard(id, info) {
    const list = document.getElementById('downloadList');
    if (!list) return;

    // Remove empty state
    const empty = list.querySelector('.empty-state');
    if (empty) empty.remove();

    const card = document.createElement('div');
    card.className = 'download-card entering';
    card.id = `card-${id}`;
    card.innerHTML = buildCardHTML(id, info);
    list.prepend(card);
    requestAnimationFrame(() => card.classList.remove('entering'));
  },

  updateDownloadCard(id, info) {
    const card = document.getElementById(`card-${id}`);
    if (!card) {
      // Card doesn't exist yet but we got progress - add it
      this.addDownloadCard(id, info);
      return;
    }
    card.innerHTML = buildCardHTML(id, info);
  },

  removeDownloadCard(id) {
    const card = document.getElementById(`card-${id}`);
    if (!card) return;
    card.classList.add('removing');
    setTimeout(() => card.remove(), 300);

    // Show empty state if no more cards
    const list = document.getElementById('downloadList');
    if (list && !list.querySelector('.download-card:not(.removing)')) {
      list.innerHTML = emptyStateHTML();
    }
  },
};

// ─── Card HTML builder ─────────────────────────────────────────────────────────
function buildCardHTML(id, info) {
  const status   = info.status || 'queued';
  const pct      = Math.min(100, Number(info.progress) || 0);
  const title    = escHtml(info.title || info.url || 'Download');
  const speed    = info.speed || '0 KB/s';
  const eta      = info.eta   || '--';
  const dl       = fmtBytes(info.downloaded || 0);
  const total    = fmtBytes(info.total || 0);
  const remaining = fmtBytes(info.remaining || 0);
  const statusLabel = statusText(status);
  const statusCls   = `status-${status}`;
  const canCancel   = ['queued','starting','downloading','processing'].includes(status);
  const isFinished  = ['completed','error','cancelled'].includes(status);

  return `
    <div class="card-inner">
      <div class="card-header">
        <div class="card-title-row">
          <span class="card-icon">${platformIcon(info.type)}</span>
          <span class="card-title">${title}</span>
          <span class="card-badge ${statusCls}">${statusLabel}</span>
        </div>
        <div class="card-meta-row">
          <span class="card-tag">${escHtml(info.type || 'video')}</span>
          <span class="card-tag">${escHtml(info.quality || '')}</span>
          <span class="card-tag">${escHtml(info.format || '')}</span>
        </div>
      </div>

      ${status !== 'queued' && status !== 'completed' && status !== 'error' && status !== 'cancelled' ? `
      <div class="progress-wrap">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-stats">
          <span class="pct-label">${pct.toFixed(1)}%</span>
          <span class="speed-label">${escHtml(speed)}</span>
          <span class="eta-label">ETA: ${escHtml(eta)}</span>
        </div>
        <div class="size-stats">
          <span>${dl} / ${total}</span>
          <span>Remaining: ${remaining}</span>
        </div>
      </div>
      ` : ''}

      ${status === 'completed' ? `
      <div class="progress-wrap done">
        <div class="progress-bar-track"><div class="progress-bar-fill full"></div></div>
        <div class="progress-stats"><span class="pct-label done-label">✓ Complete · ${total}</span></div>
      </div>
      ` : ''}

      ${status === 'error' ? `
      <div class="error-msg">${escHtml(info.error || 'Download failed')}</div>
      ` : ''}

      <div class="card-actions">
        ${canCancel ? `<button class="btn-card btn-cancel" onclick="cancelDownload('${id}')">Cancel</button>` : ''}
        ${isFinished ? `<button class="btn-card btn-clear" onclick="clearDownload('${id}')">Clear</button>` : ''}
        ${status === 'error' ? `<button class="btn-card btn-retry" onclick="retryDownload('${id}')">Retry</button>` : ''}
      </div>
    </div>
  `;
}

function emptyStateHTML() {
  return `<div class="empty-state">
    <div class="empty-icon">⬇</div>
    <div class="empty-text">No downloads yet</div>
    <div class="empty-sub">Paste a URL above and hit Download</div>
  </div>`;
}

// ─── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  State.activeTab = tab;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === tab);
  });

  // Update button text based on tab
  const dlBtn = document.getElementById('downloadBtn');
  if (dlBtn) {
    const btnText = dlBtn.querySelector('.btn-text');
    if (btnText) {
      btnText.textContent = tab === 'bulk' ? 'Start Bulk' : 'Download';
    }
  }
}

// ─── Option pill selection ─────────────────────────────────────────────────────
function selectOption(el) {
  const group = el.dataset.group;
  if (!group || el.disabled) return;
  document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// ─── Retry ─────────────────────────────────────────────────────────────────────
function retryDownload(id) {
  const info = State.downloads[id];
  if (!info) return;
  clearDownload(id);
  document.getElementById('urlInput').value = info.url;
  fetchInfo(info.url);
}

// ─── URL Input debounce ────────────────────────────────────────────────────────
let _fetchDebounce;
function onUrlInput(e) {
  const url = e.target.value.trim();
  clearTimeout(_fetchDebounce);
  if (!url) return UI.clearInfo();
  _fetchDebounce = setTimeout(() => fetchInfo(url), 800);
}

function onUrlPaste(e) {
  setTimeout(() => {
    const url = document.getElementById('urlInput')?.value?.trim();
    if (url) fetchInfo(url);
  }, 50);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtBytes(b) {
  if (!b || b <= 0) return '0 B';
  const units = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, 3)]}`;
}

function fmtNum(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return String(n);
}

function statusText(status) {
  const map = {
    queued: 'Queued', starting: 'Starting', downloading: 'Downloading',
    processing: 'Processing', completed: 'Done', error: 'Error',
    cancelled: 'Cancelled', fetching_playlist: 'Fetching Playlist',
  };
  return map[status] || status;
}

function platformIcon(type) {
  const map = { audio: '♪', playlist: '☰', video: '▶' };
  return map[type] || '▶';
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSocket();

  // URL input
  const urlInput = document.getElementById('urlInput');
  if (urlInput) {
    urlInput.addEventListener('input', onUrlInput);
    urlInput.addEventListener('paste', onUrlPaste);
  }

  // Bulk Upload setup
  const bulkBtn = document.getElementById('bulkUploadBtn');
  const bulkInput = document.getElementById('bulkUploadInput');
  const bulkInfo = document.getElementById('bulkUploadInfo');
  
  if (bulkBtn && bulkInput) {
    bulkBtn.addEventListener('click', () => bulkInput.click());
    bulkInput.addEventListener('change', () => {
      if (bulkInput.files && bulkInput.files.length > 0) {
        bulkInfo.innerHTML = `<span>Selected: ${escHtml(bulkInput.files[0].name)}</span>`;
      } else {
        bulkInfo.innerHTML = `<span>Upload a .txt file with one link per line</span>`;
      }
    });
  }

  // Download button
  const dlBtn = document.getElementById('downloadBtn');
  if (dlBtn) dlBtn.addEventListener('click', startDownload);

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Option pills
  document.querySelectorAll('.option-pill').forEach(pill => {
    pill.addEventListener('click', () => selectOption(pill));
  });

  // Cancel all
  const cancelAllBtn = document.getElementById('cancelAllBtn');
  if (cancelAllBtn) cancelAllBtn.addEventListener('click', cancelAll);

  // Check backend health
  fetch('/api/health').then(r => r.json()).then(d => {
    UI.setStatus(d.node === 'ok' ? 'connected' : 'disconnected');
  }).catch(() => UI.setStatus('disconnected'));
});

// Expose to HTML onclick handlers
window.cancelDownload = cancelDownload;
window.clearDownload  = clearDownload;
window.retryDownload  = retryDownload;
window.switchTab      = switchTab;
window.selectOption   = selectOption;
window.toggleBulkType = toggleBulkType;