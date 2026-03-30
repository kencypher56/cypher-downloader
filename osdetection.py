"""
osdetection.py - Cross-platform OS detection and path utilities.
Handles platform-specific download directory resolution.
"""

import os
import sys
import platform
import shutil


def get_os() -> str:
    """Return normalized OS name: 'windows', 'linux', or 'macos'."""
    p = sys.platform
    if p.startswith('win'):
        return 'windows'
    if p == 'darwin':
        return 'macos'
    return 'linux'


def get_home_dir() -> str:
    """Return user home directory cross-platform."""
    return str(os.path.expanduser('~'))


def get_download_dir() -> str:
    """
    Return the cypher-downloader download directory.
    ~/Downloads/cypher-downloader on all platforms.
    Windows: uses USERPROFILE or ~\\Downloads
    """
    os_name = get_os()

    if os_name == 'windows':
        base = os.environ.get('USERPROFILE', get_home_dir())
        dl   = os.path.join(base, 'Downloads', 'cypher-downloader')
    elif os_name == 'macos':
        dl = os.path.join(get_home_dir(), 'Downloads', 'cypher-downloader')
    else:
        # Linux: check XDG first
        xdg = os.environ.get('XDG_DOWNLOAD_DIR', '')
        if xdg:
            dl = os.path.join(xdg, 'cypher-downloader')
        else:
            dl = os.path.join(get_home_dir(), 'Downloads', 'cypher-downloader')

    return dl


def get_platform_info() -> dict:
    """Return detailed platform information."""
    return {
        "os":           get_os(),
        "platform":     sys.platform,
        "machine":      platform.machine(),
        "release":      platform.release(),
        "python":       sys.version.split()[0],
        "ffmpeg":       bool(shutil.which('ffmpeg')),
        "ffprobe":      bool(shutil.which('ffprobe')),
        "download_dir": get_download_dir(),
    }


def ensure_dir(path: str) -> bool:
    """Create directory if it doesn't exist. Returns True on success."""
    try:
        os.makedirs(path, exist_ok=True)
        return True
    except Exception:
        return False


def get_free_space(path: str) -> dict:
    """Return free disk space at path in bytes and human-readable."""
    try:
        stat = shutil.disk_usage(path)
        return {
            "free":  stat.free,
            "total": stat.total,
            "used":  stat.used,
            "free_human":  _human(stat.free),
            "total_human": _human(stat.total),
        }
    except Exception as e:
        return {"error": str(e)}


def _human(b: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} PB"