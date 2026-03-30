"""
conversion.py - Post-download format conversion utilities.
Wraps FFmpeg for any conversions not handled natively by yt-dlp.
"""

import os
import subprocess
import shutil
from pathlib import Path


def ffmpeg_available() -> bool:
    """Check if ffmpeg is available on the system."""
    return shutil.which('ffmpeg') is not None


def get_ffmpeg_version() -> str:
    """Return ffmpeg version string."""
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True, text=True, timeout=10
        )
        first_line = result.stdout.splitlines()[0] if result.stdout else ''
        return first_line
    except Exception:
        return 'not available'


def convert_video(input_path: str, output_path: str, video_codec: str = 'copy',
                  audio_codec: str = 'copy', extra_args: list = None) -> dict:
    """
    Convert a video file using ffmpeg.
    Returns {"success": bool, "output": str, "error": str}
    """
    if not ffmpeg_available():
        return {"success": False, "error": "ffmpeg not found on system"}

    cmd = ['ffmpeg', '-i', input_path, '-y']
    cmd += ['-vcodec', video_codec, '-acodec', audio_codec]
    if extra_args:
        cmd += extra_args
    cmd.append(output_path)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600  # 1h max
        )
        if result.returncode == 0:
            return {"success": True, "output": output_path, "error": None}
        return {"success": False, "output": None, "error": result.stderr[-500:]}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Conversion timed out"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def merge_video_audio(video_path: str, audio_path: str, output_path: str) -> dict:
    """Merge separate video and audio streams into one container."""
    if not ffmpeg_available():
        return {"success": False, "error": "ffmpeg not found"}

    cmd = [
        'ffmpeg', '-y',
        '-i', video_path,
        '-i', audio_path,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-strict', 'experimental',
        output_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if result.returncode == 0:
            return {"success": True, "output": output_path}
        return {"success": False, "error": result.stderr[-500:]}
    except Exception as e:
        return {"success": False, "error": str(e)}


def extract_audio(input_path: str, output_path: str, fmt: str = 'mp3',
                  bitrate: str = '192k') -> dict:
    """Extract audio track from a video file."""
    if not ffmpeg_available():
        return {"success": False, "error": "ffmpeg not found"}

    codec_map = {'mp3': 'libmp3lame', 'wav': 'pcm_s16le', 'flac': 'flac'}
    codec = codec_map.get(fmt, 'libmp3lame')

    cmd = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-vn',
        '-acodec', codec,
        '-ab', bitrate,
        output_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
        if result.returncode == 0:
            return {"success": True, "output": output_path}
        return {"success": False, "error": result.stderr[-500:]}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_media_info(file_path: str) -> dict:
    """Get media info for a downloaded file using ffprobe."""
    if not shutil.which('ffprobe'):
        return {"error": "ffprobe not found"}

    cmd = [
        'ffprobe', '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        file_path
    ]

    try:
        import json
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return json.loads(result.stdout)
        return {"error": result.stderr}
    except Exception as e:
        return {"error": str(e)}