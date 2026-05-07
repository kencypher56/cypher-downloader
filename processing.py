"""
processing.py - Core download and media processing logic.
Handles all yt-dlp interactions, progress tracking, retries, format management, and resume support.
"""

import os
import re
import time
import threading
import subprocess
import json
import yt_dlp
from pathlib import Path
import osdetection

# ─── Per-download cancellation flags ──────────────────────────────────────────
_cancel_flags = {}  # dl_id -> threading.Event
_cancel_lock  = threading.Lock()

# ─── Download Resume Info ─────────────────────────────────────────────────────
_resume_info = {}  # dl_id -> {"filename": "...", "partial_size": 123456}
_resume_lock = threading.Lock()

# ─── System Network Speed Cache ───────────────────────────────────────────────
_max_speed_cache = None
_max_speed_cache_time = 0
MAX_SPEED_CACHE_DURATION = 300  # Cache for 5 minutes

# ─── Resolution to yt-dlp format string mapping ───────────────────────────────
RESOLUTION_MAP = {
    '360p':  'bestvideo[height<=360]+bestaudio/best[height<=360]',
    '480p':  'bestvideo[height<=480]+bestaudio/best[height<=480]',
    '720p':  'bestvideo[height<=720]+bestaudio/best[height<=720]',
    '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    '2k':    'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
    '4k':    'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
}

BITRATE_MAP = {
    '120kbps': '128',
    '320kbps': '320',
}

AUDIO_CODEC_MAP = {
    'mp3':  'mp3',
    'wav':  'wav',
    'flac': 'flac',
}

# ─── Cancellation helpers ──────────────────────────────────────────────────────

def _get_cancel_flag(dl_id: str) -> threading.Event:
    with _cancel_lock:
        if dl_id not in _cancel_flags:
            _cancel_flags[dl_id] = threading.Event()
        return _cancel_flags[dl_id]

def cancel_download(dl_id: str):
    with _cancel_lock:
        if dl_id in _cancel_flags:
            _cancel_flags[dl_id].set()

def _cleanup_cancel_flag(dl_id: str):
    with _cancel_lock:
        _cancel_flags.pop(dl_id, None)

def cleanup_cancel_flag(dl_id: str):
    """Public function to cleanup cancel flag."""
    _cleanup_cancel_flag(dl_id)
    # Also cleanup resume info
    with _resume_lock:
        _resume_info.pop(dl_id, None)


def get_max_system_speed() -> int:
    """
    Get max system network speed in Mbps. Returns cached value if recent.
    """
    global _max_speed_cache, _max_speed_cache_time
    
    now = time.time()
    if _max_speed_cache is not None and (now - _max_speed_cache_time) < MAX_SPEED_CACHE_DURATION:
        return _max_speed_cache
    
    result = osdetection.get_max_network_speed()
    _max_speed_cache = result.get('speed_mbps', 1000)
    _max_speed_cache_time = now
    
    return _max_speed_cache


def _save_resume_info(dl_id: str, filename: str, partial_size: int):
    """Save resume information for a partial download."""
    with _resume_lock:
        _resume_info[dl_id] = {
            "filename": filename,
            "partial_size": partial_size,
            "saved_at": time.time()
        }


def _get_resume_info(dl_id: str) -> dict:
    """Retrieve resume information if available."""
    with _resume_lock:
        return _resume_info.get(dl_id, {})


# ─── Format helpers ────────────────────────────────────────────────────────────

def _make_progress_hook(dl_id: str, progress_registry: dict, lock: threading.Lock, cancel_flag: threading.Event):
    def hook(d):
        if cancel_flag.is_set():
            raise yt_dlp.utils.DownloadError("Cancelled by user")

        status = d.get('status', '')
        with lock:
            if dl_id not in progress_registry:
                return
            rec = progress_registry[dl_id]

            if status == 'downloading':
                total   = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                downloaded = d.get('downloaded_bytes', 0)
                speed   = d.get('speed', 0) or 0
                eta     = d.get('eta', 0) or 0
                pct     = (downloaded / total * 100) if total > 0 else 0

                rec['status']     = 'downloading'
                rec['progress']   = round(pct, 2)
                rec['downloaded'] = downloaded
                rec['total']      = total
                rec['remaining']  = max(0, total - downloaded)
                rec['speed']      = _fmt_speed(speed)
                rec['eta']        = _fmt_eta(eta)

            elif status == 'finished':
                rec['status']   = 'processing'
                rec['progress'] = 99
                rec['file']     = d.get('filename', rec.get('file'))

            elif status == 'error':
                rec['status'] = 'error'
                rec['error']  = str(d.get('error', 'Unknown error'))

    return hook

# ─── Format helpers ────────────────────────────────────────────────────────────

def _fmt_speed(bps: float) -> str:
    if bps <= 0:
        return "0 KB/s"
    if bps >= 1_048_576:
        return f"{bps/1_048_576:.2f} MB/s"
    return f"{bps/1024:.1f} KB/s"

def _fmt_eta(seconds: int) -> str:
    if not seconds or seconds <= 0:
        return "--"
    m, s = divmod(int(seconds), 60)
    if m >= 60:
        h, m = divmod(m, 60)
        return f"{h}h {m}m"
    return f"{m}m {s}s" if m else f"{s}s"

def _resolve_fmt_str(quality: str, fps: str = '30fps', media_type: str = 'video') -> str:
    q = quality.lower().replace(' ', '')
    base = RESOLUTION_MAP.get(q, RESOLUTION_MAP['720p'])
    if fps == '60fps':
        base = base.replace('bestvideo[height<=', 'bestvideo[fps<=60][height<=')
    return base

# ─── Media Info Fetching ───────────────────────────────────────────────────────

def fetch_media_info(url: str) -> dict:
    """Extract metadata without downloading."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
        'socket_timeout': 30,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        return _parse_info(info)
    except yt_dlp.utils.DownloadError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"Failed to fetch info: {e}"}


def _parse_info(info: dict) -> dict:
    """Parse yt-dlp info dict into a clean response."""
    if not info:
        return {"error": "No info returned"}

    formats = info.get('formats', [])
    resolutions = set()
    has_audio = False

    for f in formats:
        h = f.get('height')
        if h:
            if   h <= 360:  resolutions.add('360p')
            elif h <= 480:  resolutions.add('480p')
            elif h <= 720:  resolutions.add('720p')
            elif h <= 1080: resolutions.add('1080p')
            elif h <= 1440: resolutions.add('2K')
            else:           resolutions.add('4K')
        if f.get('acodec') not in (None, 'none'):
            has_audio = True

    res_order = ['360p', '480p', '720p', '1080p', '2K', '4K']
    available_resolutions = [r for r in res_order if r in resolutions]

    duration = info.get('duration', 0)
    m, s = divmod(int(duration or 0), 60)

    return {
        "title":       info.get('title', 'Unknown'),
        "uploader":    info.get('uploader', 'Unknown'),
        "duration":    f"{m}:{s:02d}",
        "thumbnail":   info.get('thumbnail', ''),
        "platform":    info.get('extractor_key', 'Unknown'),
        "is_playlist": info.get('_type') == 'playlist',
        "playlist_count": info.get('playlist_count', 0),
        "resolutions": available_resolutions,
        "has_audio":   has_audio,
        "views":       info.get('view_count', 0),
        "description": (info.get('description', '') or '')[:200],
    }


def get_available_formats(url: str) -> dict:
    """Return detailed format list for a URL."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        formats = []
        for f in (info.get('formats') or []):
            formats.append({
                'id':        f.get('format_id'),
                'ext':       f.get('ext'),
                'resolution': f.get('resolution', 'audio only'),
                'fps':       f.get('fps'),
                'filesize':  f.get('filesize') or f.get('filesize_approx'),
                'vcodec':    f.get('vcodec'),
                'acodec':    f.get('acodec'),
                'tbr':       f.get('tbr'),
            })
        return {"formats": formats}
    except Exception as e:
        return {"error": str(e), "formats": []}

# ─── Video Download ────────────────────────────────────────────────────────────

def download_video(url: str, fmt: str, quality: str, fps: str,
                   download_dir: str, dl_id: str,
                   progress_registry: dict, lock: threading.Lock):
    """Download a video with retry logic."""
    cancel_flag = _get_cancel_flag(dl_id)
    fmt_str = _resolve_fmt_str(quality, fps)

    # Output template
    out_tmpl = os.path.join(download_dir, '%(title).80s.%(ext)s')

    # Postprocessors
    postprocessors = [{
        'key': 'FFmpegVideoConvertor',
        'preferedformat': fmt if fmt in ('mp4', 'mkv', 'webm') else 'mp4',
    }]
    if fmt == 'mkv':
        postprocessors = []  # mkv: keep native

    max_retries = 3
    last_error  = None

    for attempt in range(1, max_retries + 1):
        if cancel_flag.is_set():
            break

        with lock:
            if dl_id in progress_registry:
                progress_registry[dl_id]['status'] = 'downloading'
                progress_registry[dl_id]['attempt'] = attempt

        ydl_opts = {
            'format':            fmt_str,
            'outtmpl':           out_tmpl,
            'merge_output_format': fmt if fmt in ('mp4', 'mkv', 'webm') else 'mp4',
            'progress_hooks':    [_make_progress_hook(dl_id, progress_registry, lock, cancel_flag)],
            'quiet':             True,
            'no_warnings':       True,
            'noplaylist':        True,
            'retries':           5,
            'fragment_retries':  5,
            'skip_unavailable_fragments': True,  # Allow resume on partial downloads
            'socket_timeout':    30,
            'http_chunk_size':   10485760,  # 10MB chunks
            'concurrent_fragment_downloads': 4,
            'continuedl':        True,  # Resume incomplete file downloads
            'postprocessors':    postprocessors,
            'writeinfojson':     False,
            'writethumbnail':    False,
        }

        # TikTok: no watermark
        if 'tiktok' in url.lower():
            ydl_opts['format'] = 'bestvideo+bestaudio/best'

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            with lock:
                if dl_id in progress_registry:
                    progress_registry[dl_id]['status']   = 'completed'
                    progress_registry[dl_id]['progress'] = 100
            _cleanup_cancel_flag(dl_id)
            return

        except yt_dlp.utils.DownloadError as e:
            last_error = str(e)
            if 'Cancelled' in last_error or cancel_flag.is_set():
                break
            if attempt < max_retries:
                time.sleep(2 ** attempt)  # exponential backoff
        except Exception as e:
            last_error = str(e)
            break

    with lock:
        if dl_id in progress_registry:
            progress_registry[dl_id]['status'] = 'cancelled' if cancel_flag.is_set() else 'error'
            progress_registry[dl_id]['error']  = last_error or 'Download failed'
    _cleanup_cancel_flag(dl_id)

# ─── Audio Download ────────────────────────────────────────────────────────────

def download_audio(url: str, fmt: str, bitrate: str,
                   download_dir: str, dl_id: str,
                   progress_registry: dict, lock: threading.Lock):
    """Extract and convert audio."""
    cancel_flag = _get_cancel_flag(dl_id)
    audio_fmt   = AUDIO_CODEC_MAP.get(fmt, 'mp3')
    audio_qual  = BITRATE_MAP.get(bitrate, '192')
    out_tmpl    = os.path.join(download_dir, '%(title).80s.%(ext)s')

    max_retries = 3
    last_error  = None

    postprocessors = [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': audio_fmt,
        'preferredquality': audio_qual,
    }]

    if audio_fmt == 'mp3':
        postprocessors.append({
            'key': 'FFmpegMetadata',
            'add_metadata': True,
        })

    for attempt in range(1, max_retries + 1):
        if cancel_flag.is_set():
            break

        with lock:
            if dl_id in progress_registry:
                progress_registry[dl_id]['status'] = 'downloading'
                progress_registry[dl_id]['attempt'] = attempt

        ydl_opts = {
            'format':           'bestaudio/best',
            'outtmpl':          out_tmpl,
            'progress_hooks':   [_make_progress_hook(dl_id, progress_registry, lock, cancel_flag)],
            'quiet':            True,
            'no_warnings':      True,
            'noplaylist':       True,
            'retries':          5,
            'fragment_retries': 5,
            'skip_unavailable_fragments': True,  # Allow resume on partial downloads
            'socket_timeout':   30,
            'continuedl':       True,  # Resume incomplete file downloads
            'postprocessors':   postprocessors,
            'writeinfojson':    False,
            'writethumbnail':   False,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            with lock:
                if dl_id in progress_registry:
                    progress_registry[dl_id]['status']   = 'completed'
                    progress_registry[dl_id]['progress'] = 100
            _cleanup_cancel_flag(dl_id)
            return

        except yt_dlp.utils.DownloadError as e:
            last_error = str(e)
            if 'Cancelled' in last_error or cancel_flag.is_set():
                break
            if attempt < max_retries:
                time.sleep(2 ** attempt)
        except Exception as e:
            last_error = str(e)
            break

    with lock:
        if dl_id in progress_registry:
            progress_registry[dl_id]['status'] = 'cancelled' if cancel_flag.is_set() else 'error'
            progress_registry[dl_id]['error']  = last_error or 'Audio download failed'
    _cleanup_cancel_flag(dl_id)

# ─── Playlist Download ─────────────────────────────────────────────────────────

def download_playlist(url: str, fmt: str, quality: str, fps: str,
                      download_dir: str, dl_id: str,
                      progress_registry: dict, lock: threading.Lock):
    """Download a full playlist."""
    cancel_flag = _get_cancel_flag(dl_id)
    fmt_str     = _resolve_fmt_str(quality, fps)
    playlist_dir = os.path.join(download_dir, 'playlists')
    os.makedirs(playlist_dir, exist_ok=True)
    out_tmpl = os.path.join(playlist_dir, '%(playlist_title).60s', '%(playlist_index)s - %(title).80s.%(ext)s')

    with lock:
        if dl_id in progress_registry:
            progress_registry[dl_id]['status'] = 'fetching_playlist'

    ydl_opts = {
        'format':              fmt_str,
        'outtmpl':             out_tmpl,
        'merge_output_format': fmt if fmt in ('mp4', 'mkv') else 'mp4',
        'progress_hooks':      [_make_progress_hook(dl_id, progress_registry, lock, cancel_flag)],
        'quiet':               True,
        'no_warnings':         True,
        'retries':             5,
        'fragment_retries':    5,
        'skip_unavailable_fragments': True,  # Allow resume on partial downloads
        'socket_timeout':      30,
        'http_chunk_size':     10485760,
        'concurrent_fragment_downloads': 4,
        'continuedl':          True,  # Resume incomplete file downloads
        'ignoreerrors':        True,  # skip unavailable videos
        'writeinfojson':       False,
        'writethumbnail':      False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        with lock:
            if dl_id in progress_registry:
                progress_registry[dl_id]['status']   = 'completed'
                progress_registry[dl_id]['progress'] = 100
    except Exception as e:
        with lock:
            if dl_id in progress_registry:
                progress_registry[dl_id]['status'] = 'error'
                progress_registry[dl_id]['error']  = str(e)
    finally:
        _cleanup_cancel_flag(dl_id)