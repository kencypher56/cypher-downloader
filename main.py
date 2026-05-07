#!/usr/bin/env python3
"""
Cypher Downloader - Python Backend
Handles all download, processing, and conversion operations.
Runs on port 4002, serves as the download engine.
"""

import sys
import os
import json
import threading
import signal
import uuid
import time
from queue import Queue
from flask import Flask, request, jsonify
from flask_cors import CORS

# Import our modules
import processing
import conversion
import osdetection

app = Flask(__name__)
CORS(app, origins="*")

# ─── Active Downloads Registry ────────────────────────────────────────────────
active_downloads = {}  # download_id -> download thread/info
download_lock = threading.Lock()

# ─── Download Queue & Concurrency Control ─────────────────────────────────────
MAX_CONCURRENT_DOWNLOADS = 5  # Limit to avoid system overload
download_queue = Queue()
active_download_threads = []
download_semaphore = threading.Semaphore(MAX_CONCURRENT_DOWNLOADS)

# ─── Cleanup Configuration ────────────────────────────────────────────────────
CLEANUP_OLD_DOWNLOADS_AFTER_MS = 86400000  # 24 hours
CLEANUP_INTERVAL_MS = 3600000  # Check every hour

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "engine": "cypher-python", "version": "1.0.0"})


# ─── Helper Functions ─────────────────────────────────────────────────────────

def _generate_download_id() -> str:
    """Generate a unique download ID (full UUID)."""
    return str(uuid.uuid4())


def _init_download_entry(dl_id: str, url: str, media_type: str) -> dict:
    """Initialize a download registry entry with all required fields."""
    return {
        "id": dl_id,
        "url": url,
        "type": media_type,
        "status": "queued",
        "progress": 0,
        "speed": "0 KB/s",
        "eta": "--",
        "downloaded": 0,
        "total": 0,
        "file": None,
        "error": None,
        "attempt": 1,
        "created_at": time.time(),
        "started_at": None,
        "completed_at": None,
    }


def _cleanup_old_downloads():
    """Remove old completed/errored downloads from registry (keep resume info in files)."""
    now = time.time()
    with download_lock:
        to_remove = []
        for dl_id, entry in active_downloads.items():
            if entry['status'] in ['completed', 'error', 'cancelled']:
                # Only cleanup if older than threshold and has a completion time
                if entry.get('completed_at') and (now - entry['completed_at']) > (CLEANUP_OLD_DOWNLOADS_AFTER_MS / 1000):
                    # Don't delete download files, keep resume info
                    to_remove.append(dl_id)
        
        for dl_id in to_remove:
            active_downloads.pop(dl_id, None)
            processing.cleanup_cancel_flag(dl_id)


def _start_download_worker(dl_id: str, url: str, media_type: str, quality: str, fmt: str, fps: str):
    """Worker thread for a single download with concurrency control."""
    try:
        download_semaphore.acquire()  # Wait for slot
        
        download_dir = osdetection.get_download_dir()
        os.makedirs(download_dir, exist_ok=True)

        with download_lock:
            if dl_id in active_downloads:
                active_downloads[dl_id]['status'] = 'downloading'
                active_downloads[dl_id]['started_at'] = time.time()

        try:
            if media_type == 'playlist':
                processing.download_playlist(
                    url=url, fmt=fmt, quality=quality, fps=fps,
                    download_dir=download_dir, dl_id=dl_id,
                    progress_registry=active_downloads, lock=download_lock
                )
            elif media_type == 'audio':
                processing.download_audio(
                    url=url, fmt=fmt, bitrate=quality,
                    download_dir=download_dir, dl_id=dl_id,
                    progress_registry=active_downloads, lock=download_lock
                )
            else:
                processing.download_video(
                    url=url, fmt=fmt, quality=quality, fps=fps,
                    download_dir=download_dir, dl_id=dl_id,
                    progress_registry=active_downloads, lock=download_lock
                )

            with download_lock:
                if dl_id in active_downloads:
                    active_downloads[dl_id]['completed_at'] = time.time()

        except Exception as e:
            with download_lock:
                if dl_id in active_downloads:
                    active_downloads[dl_id]['status'] = 'error'
                    active_downloads[dl_id]['error'] = str(e)
                    active_downloads[dl_id]['completed_at'] = time.time()
    finally:
        download_semaphore.release()


# ─── Periodic Cleanup ────────────────────────────────────────────────────────

def _start_cleanup_thread():
    """Start background thread for cleanup."""
    def cleanup_loop():
        while True:
            time.sleep(CLEANUP_INTERVAL_MS / 1000)
            _cleanup_old_downloads()
    
    t = threading.Thread(target=cleanup_loop, daemon=True)
    t.start()




@app.route('/info', methods=['POST'])
def fetch_info():
    """Fetch media metadata before downloading."""
    data = request.get_json()
    url = data.get('url', '').strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    result = processing.fetch_media_info(url)
    if result.get('error'):
        return jsonify(result), 422
    return jsonify(result)


@app.route('/download', methods=['POST'])
def start_download():
    """Start a new download task."""
    data = request.get_json()
    url        = data.get('url', '').strip()
    media_type = data.get('type', 'video')   # 'video' | 'audio' | 'playlist'
    quality    = data.get('quality', '720p')  # resolution or bitrate
    fmt        = data.get('format', 'mp4')    # mp4/mkv/mp3/wav/flac
    fps        = data.get('fps', '30fps')
    dl_id      = data.get('id', None)

    if not url or not dl_id:
        return jsonify({"error": "url and id are required"}), 400

    # Initialize registry entry ONCE before starting thread
    with download_lock:
        if dl_id not in active_downloads:
            active_downloads[dl_id] = _init_download_entry(dl_id, url, media_type)
        else:
            # Update existing entry without replacing it
            active_downloads[dl_id].update({
                "url": url,
                "type": media_type,
                "status": "queued"
            })

    # Start worker thread with concurrency control
    t = threading.Thread(
        target=_start_download_worker,
        args=(dl_id, url, media_type, quality, fmt, fps),
        daemon=True
    )
    t.start()
    active_download_threads.append(t)

    return jsonify({"id": dl_id, "status": "queued"})


@app.route('/download/bulk', methods=['POST'])
def start_bulk_download():
    """Start bulk download from text content."""
    data = request.get_json()
    text = data.get('text', '')
    media_type = data.get('type', 'video')
    quality = data.get('quality', '720p')
    fmt = data.get('format', 'mp4')
    fps = data.get('fps', '30fps')

    if not text:
        return jsonify({"error": "text required"}), 400

    # ── Parse URLs from text ──────────────────────────────────────────────────
    urls = []
    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue
        # Basic URL validation
        if not (line.startswith('http://') or line.startswith('https://')):
            continue
        urls.append(line)

    if not urls:
        return jsonify({"error": "No valid URLs found in text"}), 400

    # ── Initialize all entries FIRST (before spawning threads) ───────────────
    results = []
    with download_lock:
        for url in urls:
            dl_id = _generate_download_id()  # Full UUID
            
            # Initialize entry in registry ONCE
            active_downloads[dl_id] = _init_download_entry(dl_id, url, media_type)
            
            results.append({"id": dl_id, "url": url})

    # ── Spawn worker threads (registry entries already exist) ────────────────
    for result in results:
        dl_id = result["id"]
        url = result["url"]
        
        t = threading.Thread(
            target=_start_download_worker,
            args=(dl_id, url, media_type, quality, fmt, fps),
            daemon=True
        )
        t.start()
        active_download_threads.append(t)

    return jsonify({"downloads": results})


@app.route('/progress/<dl_id>', methods=['GET'])
def get_progress(dl_id):
    """Get progress for a specific download."""
    with download_lock:
        info = active_downloads.get(dl_id)
    if not info:
        return jsonify({"error": "Download not found"}), 404

    safe = {k: v for k, v in info.items() if k != 'thread'}
    return jsonify(safe)


@app.route('/progress', methods=['GET'])
def get_all_progress():
    """Get progress for all downloads."""
    with download_lock:
        safe = {k: {x: v[x] for x in v if x != 'thread'} for k, v in active_downloads.items()}
    return jsonify(safe)


@app.route('/cancel/<dl_id>', methods=['POST'])
def cancel_download(dl_id):
    """Cancel an active download."""
    with download_lock:
        info = active_downloads.get(dl_id)
        if info:
            info['status'] = 'cancelled'
    processing.cancel_download(dl_id)
    return jsonify({"id": dl_id, "status": "cancelled"})


@app.route('/cancel-all', methods=['POST'])
def cancel_all():
    """Cancel all active downloads."""
    with download_lock:
        for dl_id in list(active_downloads.keys()):
            active_downloads[dl_id]['status'] = 'cancelled'
            processing.cancel_download(dl_id)
    return jsonify({"status": "all_cancelled"})


@app.route('/clear/<dl_id>', methods=['DELETE'])
def clear_download(dl_id):
    """Remove a completed/errored download from registry."""
    with download_lock:
        active_downloads.pop(dl_id, None)
    return jsonify({"id": dl_id, "removed": True})


@app.route('/formats', methods=['POST'])
def get_formats():
    """Get available formats for a URL."""
    data = request.get_json()
    url = data.get('url', '').strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    result = processing.get_available_formats(url)
    return jsonify(result)


@app.route('/platform', methods=['GET'])
def get_platform():
    """Return OS/platform info."""
    return jsonify(osdetection.get_platform_info())


@app.route('/network-speed', methods=['GET'])
def get_network_speed():
    """Return max system network speed in Mbps."""
    max_speed = processing.get_max_system_speed()
    return jsonify({
        "max_speed_mbps": max_speed,
        "source": "system_detection"
    })


# ─── Main ─────────────────────────────────────────────────────────────────────

def shutdown(sig, frame):
    print("\n[Cypher] Shutting down Python engine...")
    sys.exit(0)

signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

if __name__ == '__main__':
    print("[Cypher] Python download engine starting on port 4002...")
    print(f"[Cypher] Download dir: {osdetection.get_download_dir()}")
    print(f"[Cypher] Max concurrent downloads: {MAX_CONCURRENT_DOWNLOADS}")
    
    # Start cleanup thread
    _start_cleanup_thread()
    
    # Detect network speed on startup
    net_speed = processing.get_max_system_speed()
    print(f"[Cypher] Max network speed detected: {net_speed} Mbps\n")
    
    app.run(host='0.0.0.0', port=4002, threaded=True, debug=False)