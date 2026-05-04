
<!--
  Cypher Downloader – Cross-platform advanced media downloader
  Author: Kencypher
  GitHub-friendly README with badges, emojis, and structured content.
-->

<div align="center">
  <h1>🔻 Cypher Downloader</h1>
  <p><strong>Cross‑platform advanced media downloader</strong> — modern animated GUI, multi‑platform support, batch operations, and real‑time progress.</p>
  
  <!-- Badges (shields.io) -->
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white" alt="Express.js">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Platforms-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey" alt="Platforms">
  <br>
  <img src="https://img.shields.io/badge/YouTube-FF0000?logo=youtube&logoColor=white" alt="YouTube">
  <img src="https://img.shields.io/badge/Instagram-E4405F?logo=instagram&logoColor=white" alt="Instagram">
  <img src="https://img.shields.io/badge/TikTok-000000?logo=tiktok&logoColor=white" alt="TikTok">
  <img src="https://img.shields.io/badge/Facebook-1877F2?logo=facebook&logoColor=white" alt="Facebook">
</div>

---

## ✨ Features

| | |
|---|---|
| 🌍 **Multi‑platform** | YouTube, Instagram, Facebook, TikTok (no watermark), direct video links |
| 🎬 **Quality & Format** | Resolutions up to 4K, 30/60 fps, audio extraction (MP3, WAV, FLAC) with bitrate options |
| 📜 **Playlist support** | Download full playlists in one click with selected format |
| 📦 **Bulk Downloading** | Upload a `.txt` file with links to download multiple videos/audios simultaneously |
| 📊 **Real‑time progress** | Speed, percentage, remaining size, smooth progress bar |
| ⚡ **Resumable & Parallel** | Multi‑download manager, resume broken downloads, efficient parallel system |
| 🎨 **4 Animated Themes** | Kuromi, Cyberpunk 2077, PlayStation 4, Elden Ring — light/dark variants |

---

## 🧠 Tech Stack

- **Backend**: Python 3.10+ (download & processing) + Node.js / Express.js (API bridge)
- **Frontend**: HTML5, CSS3, JavaScript, Tailwind CSS
- **Communication**: REST API (Node ↔ Python)
- **Icons & Fonts**: `thesvg` npm package

---

## 📁 Project Structure

```
cypher-downloader/
├── main.py                 # Python entry point
├── processing.py           # Download logic
├── conversion.py           # Format conversion (audio/video)
├── osdetection.py          # OS-specific paths
├── server.js               # Node.js server (Express)
├── processing.js           # Frontend handlers
├── downloading.js          # Download UI logic
├── progress.js             # Progress bar & metrics
├── backendconnection.js    # API calls to Node/Python
├── network.js              # Network utilities
├── ui.js                   # UI updates & theming
├── themes.js               # Theme definitions
├── index.html              # Main GUI
├── styles.css              # Additional styles (Tailwind + custom)
├── package.json
├── requirements.txt
└── README.md
```

---

## 🚀 Installation & Running

### Prerequisites
- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`

### 1. Clone the repository
```bash
git clone https://github.com/Kencypher/cypher-downloader.git
cd cypher-downloader
```

### 2. Set up Python environment
```bash
python -m venv venv
source venv/bin/activate   # Linux/macOS
# or venv\Scripts\activate on Windows

pip install -r requirements.txt
```

### 3. Install Node dependencies
```bash
npm install
```

### 4. Run the application
Open **two terminals**:

**Terminal 1 (Python backend):**
```bash
python main.py
```

**Terminal 2 (Node server):**
```bash
npm start
```

Then open your browser at `http://localhost:3000`.

---

## 🐧 Linux systemd service (optional)

Run both processes as a single service:

```bash
sudo systemctl start cypher-downloader
sudo systemctl enable cypher-downloader   # autostart on boot
```

> See `start.sh` and the unit file in the repository for details.

---

## ⚙️ Architecture

Cypher Downloader uses a **hybrid model**:
- **Python layer** handles downloading, processing, conversion (yt-dlp, ffmpeg).
- **Node.js (Express)** serves the frontend and acts as a REST bridge.
- **Frontend** communicates with Node via API, which spawns Python subprocesses or uses HTTP calls.
- Real‑time progress is streamed via WebSockets or polling.

---

## 🎯 Supported Sources & Formats

| Source | Video | Audio |
|--------|-------|-------|
| YouTube | ✅ up to 4K | ✅ MP3/WAV/FLAC |
| Instagram | ✅ up to 1080p | ❌ |
| TikTok (no watermark) | ✅ up to 1080p | ❌ |
| Facebook | ✅ up to 1080p | ❌ |
| Direct video links | ✅ auto-detect | ❌ |

- **Resolutions**: 360p, 480p, 720p, 1080p, 2K, 4K (conditional)
- **Audio bitrates**: 120kbps, 320kbps

---

## 📦 Bulk Downloading

Cypher Downloader supports downloading multiple media files simultaneously by reading URLs directly from a text file. This is handled entirely by the Python backend for maximum efficiency.

### How to use:
1. Create a plain `.txt` file containing your links, with **one URL per line**. (e.g., YouTube videos, Shorts, Instagram links).
2. Open the **Bulk Upload** tab in the Cypher Downloader UI.
3. Select your desired **Media Type** (Video or Audio).
4. Choose your preferred quality and format settings. *Note: The settings you select here will be applied to ALL links in your text file.*
5. Click **Choose Text File** and select your `.txt` file.
6. Click **Download**. The engine will automatically parse the file and start a parallel download process for each valid link.

---

## 🎨 Theme Customization

Switch between four animated themes from the UI. Each theme includes light & dark variants with smooth RGB hover effects. All icons and fonts are pulled from the `thesvg` npm package — no external assets needed.

---

## 🛡️ Error Handling & Retries

- User‑friendly error messages
- Automatic retry on network failure
- Smart format merging
- Default download location: `~/Downloads/cypher-downloader` (configurable)

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first. Make sure to update tests as appropriate.

---

## 📄 License

MIT © **Kencypher**

---

<div align="center">
  Built with ❤️ using Python, Node.js, and pure creativity.
</div>


