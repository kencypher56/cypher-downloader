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

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "engine": "cypher-python", "version": "1.0.0"})


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

    download_dir = osdetection.get_download_dir()
    os.makedirs(download_dir, exist_ok=True)

    def run_download():
        with download_lock:
            active_downloads[dl_id] = {
                "id": dl_id, "url": url, "status": "starting",
                "progress": 0, "speed": "0 KB/s", "eta": "--",
                "downloaded": 0, "total": 0, "file": None, "error": None
            }

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
        except Exception as e:
            with download_lock:
                if dl_id in active_downloads:
                    active_downloads[dl_id]['status'] = 'error'
                    active_downloads[dl_id]['error'] = str(e)

    t = threading.Thread(target=run_download, daemon=True)
    t.start()

    with download_lock:
        active_downloads[dl_id] = active_downloads.get(dl_id, {
            "id": dl_id, "status": "queued", "progress": 0
        })
        active_downloads[dl_id]['thread'] = None  # not serializable, just flag

    return jsonify({"id": dl_id, "status": "started"})


@app.route('/download/bulk', methods=['POST'])
def start_bulk_download():
    """Start bulk download from text content."""
    data = request.get_json()
    text = data.get('text', '')
    media_type = data.get('type', 'video')
    quality = data.get('quality', '720p')
    fmt = data.get('format', 'mp4')
    fps = data.get('fps', '30fps')

    # Parse and validate URLs from text
    urls = []
    for line in text.split('\n'):
        line = line.strip()
        if line and (line.startswith('http://') or line.startswith('https://')):
            urls.append(line)
    
    if not urls:
        return jsonify({"error": "No valid URLs found in text file"}), 400

    results = []
    download_dir = osdetection.get_download_dir()
    os.makedirs(download_dir, exist_ok=True)

    for url in urls:
        dl_id = str(uuid.uuid4())[:8]
        
        def run_download(current_url=url, current_id=dl_id):
            with download_lock:
                active_downloads[current_id] = {
                    "id": current_id, "url": current_url, "status": "starting",
                    "progress": 0, "speed": "0 KB/s", "eta": "--",
                    "downloaded": 0, "total": 0, "file": None, "error": None
                }

            try:
                if media_type == 'playlist':
                    processing.download_playlist(
                        url=current_url, fmt=fmt, quality=quality, fps=fps,
                        download_dir=download_dir, dl_id=current_id,
                        progress_registry=active_downloads, lock=download_lock
                    )
                elif media_type == 'audio':
                    processing.download_audio(
                        url=current_url, fmt=fmt, bitrate=quality,
                        download_dir=download_dir, dl_id=current_id,
                        progress_registry=active_downloads, lock=download_lock
                    )
                else:
                    processing.download_video(
                        url=current_url, fmt=fmt, quality=quality, fps=fps,
                        download_dir=download_dir, dl_id=current_id,
                        progress_registry=active_downloads, lock=download_lock
                    )
            except Exception as e:
                with download_lock:
                    if current_id in active_downloads:
                        active_downloads[current_id]['status'] = 'error'
                        active_downloads[current_id]['error'] = str(e)

        t = threading.Thread(target=run_download, daemon=True)
        t.start()

        with download_lock:
            active_downloads[dl_id] = active_downloads.get(dl_id, {
                "id": dl_id, "status": "queued", "progress": 0, "url": url
            })
            active_downloads[dl_id]['thread'] = None
            
        results.append({"id": dl_id, "url": url})

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


# ─── Main ─────────────────────────────────────────────────────────────────────

def shutdown(sig, frame):
    print("\n[Cypher] Shutting down Python engine...")
    sys.exit(0)

signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

if __name__ == '__main__':
    print("[Cypher] Python download engine starting on port 4002...")
    print(f"[Cypher] Download dir: {osdetection.get_download_dir()}")
    app.run(host='0.0.0.0', port=4002, threaded=True, debug=False)