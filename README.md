<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>README · Cypher Downloader</title>
  <!-- Font Awesome 6 (free) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: linear-gradient(135deg, #0b1120 0%, #1a1f2e 100%);
      font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif;
      color: #e2e8f0;
      line-height: 1.6;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(2px);
      border-radius: 2rem;
      padding: 2rem 2rem 3rem;
      box-shadow: 0 25px 45px -12px rgba(0,0,0,0.5);
      border: 1px solid rgba(100, 108, 255, 0.2);
    }
    h1, h2, h3 {
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    h1 {
      font-size: 3rem;
      background: linear-gradient(135deg, #a855f7, #3b82f6);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      display: inline-block;
      margin-bottom: 0.5rem;
    }
    .badge-group {
      margin: 1rem 0 1.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
    }
    .badge {
      background: #1e293b;
      padding: 0.3rem 0.8rem;
      border-radius: 40px;
      font-size: 0.85rem;
      font-weight: 500;
      border: 1px solid #334155;
      transition: all 0.2s;
    }
    .badge i {
      margin-right: 0.4rem;
      color: #8b5cf6;
    }
    .badge:hover {
      border-color: #8b5cf6;
      background: #2d3a5e;
    }
    hr {
      border: none;
      height: 1px;
      background: linear-gradient(90deg, transparent, #3b82f6, #a855f7, transparent);
      margin: 2rem 0;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .feature-card {
      background: #0f172a;
      border-radius: 1.5rem;
      padding: 1.5rem;
      border: 1px solid #2d3a5e;
      transition: transform 0.2s, border-color 0.2s;
    }
    .feature-card:hover {
      transform: translateY(-5px);
      border-color: #8b5cf6;
    }
    .feature-card i {
      font-size: 2rem;
      color: #8b5cf6;
      margin-bottom: 1rem;
    }
    .feature-card h3 {
      font-size: 1.4rem;
      margin-bottom: 0.75rem;
    }
    .tech-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      margin: 1rem 0;
    }
    .tech-tag {
      background: #1e293b;
      padding: 0.3rem 1rem;
      border-radius: 30px;
      font-size: 0.85rem;
      font-weight: 500;
      font-family: monospace;
    }
    code {
      background: #0f172a;
      padding: 0.2rem 0.5rem;
      border-radius: 8px;
      font-family: 'Fira Code', monospace;
      font-size: 0.9rem;
      color: #c084fc;
    }
    pre {
      background: #0a0f1c;
      padding: 1rem;
      border-radius: 1rem;
      overflow-x: auto;
      border-left: 4px solid #8b5cf6;
      margin: 1.5rem 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #3b82f6;
      color: white;
      padding: 0.6rem 1.2rem;
      border-radius: 40px;
      text-decoration: none;
      font-weight: 600;
      transition: 0.2s;
      border: none;
      cursor: pointer;
    }
    .btn:hover {
      background: #2563eb;
      transform: scale(1.02);
    }
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #2d3a5e;
      font-size: 0.9rem;
      color: #94a3b8;
    }
    a {
      color: #a855f7;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .center {
      text-align: center;
    }
    @media (max-width: 680px) {
      body {
        padding: 1rem;
      }
      .container {
        padding: 1.5rem;
      }
    }
  </style>
</head>
<body>
<div class="container">
  <div class="center">
    <i class="fas fa-download" style="font-size: 3rem; color: #8b5cf6;"></i>
    <h1>Cypher Downloader</h1>
    <p style="font-size: 1.2rem; max-width: 700px; margin: 1rem auto;">
      <strong>Cross‑platform advanced media downloader</strong> — modern animated GUI, multi‑platform support, batch operations, and real‑time progress.
    </p>
    <div class="badge-group">
      <span class="badge"><i class="fab fa-python"></i> Python 3.10+</span>
      <span class="badge"><i class="fab fa-node-js"></i> Node.js + Express</span>
      <span class="badge"><i class="fas fa-palette"></i> Tailwind CSS</span>
      <span class="badge"><i class="fas fa-window-maximize"></i> Windows · Linux · macOS</span>
      <span class="badge"><i class="fas fa-play"></i> YouTube · Instagram · TikTok · Facebook</span>
    </div>
  </div>

  <hr>

  <h2><i class="fas fa-star-of-life"></i> ✨ Features</h2>
  <div class="feature-grid">
    <div class="feature-card"><i class="fab fa-youtube"></i><h3>Multi‑platform</h3><p>YouTube, Instagram, Facebook, TikTok (no watermark), and direct video links.</p></div>
    <div class="feature-card"><i class="fas fa-film"></i><h3>Quality & Format</h3><p>Resolutions up to 4K, 30/60 fps, audio extraction (MP3, WAV, FLAC) with bitrate options.</p></div>
    <div class="feature-card"><i class="fas fa-list-ul"></i><h3>Playlist support</h3><p>Download full playlists in one click with selected format.</p></div>
    <div class="feature-card"><i class="fas fa-tachometer-alt"></i><h3>Real‑time progress</h3><p>Speed, percentage, remaining size, and a smooth progress bar.</p></div>
    <div class="feature-card"><i class="fas fa-arrow-alt-circle-down"></i><h3>Resumable & Parallel</h3><p>Multi‑download manager, resume broken downloads, efficient parallel system.</p></div>
    <div class="feature-card"><i class="fas fa-paint-roller"></i><h3>4 Animated Themes</h3><p>Kuromi, Cyberpunk 2077, PlayStation 4, Elden Ring — light/dark variants.</p></div>
  </div>

  <h2><i class="fas fa-microchip"></i> 🧠 Tech Stack</h2>
  <div class="tech-stack">
    <span class="tech-tag">Python 3.10+</span>
    <span class="tech-tag">Node.js + Express</span>
    <span class="tech-tag">HTML5 / CSS3 / JS</span>
    <span class="tech-tag">Tailwind CSS</span>
    <span class="tech-tag">REST API (Node ↔ Python bridge)</span>
    <span class="tech-tag">thesvg (icons/fonts via npm)</span>
  </div>

  <h2><i class="fas fa-folder-tree"></i> 📁 Project Structure</h2>
  <pre>
cypher-downloader/
├── backend/           (Python core)
│   ├── main.py
│   ├── processing.py
│   ├── conversion.py
│   └── osdetection.py
├── frontend/          (Node + UI)
│   ├── server.js
│   ├── processing.js
│   ├── downloading.js
│   ├── progress.js
│   ├── backendconnection.js
│   ├── network.js
│   ├── ui.js
│   ├── themes.js
│   ├── index.html
│   └── styles.css
├── package.json
├── requirements.txt
└── README.md
  </pre>

  <h2><i class="fas fa-download"></i> 🚀 Installation & Running</h2>
  <h3>Prerequisites</h3>
  <ul style="margin-left: 1.5rem;">
    <li>Python 3.10+ with pip</li>
    <li>Node.js 18+ and npm</li>
    <li>Git (optional)</li>
  </ul>

  <h3>1. Clone repository</h3>
  <pre><code>git clone https://github.com/Kencypher/cypher-downloader.git
cd cypher-downloader</code></pre>

  <h3>2. Python environment setup</h3>
  <pre><code>python -m venv venv
source venv/bin/activate   # Linux/macOS
# or venv\Scripts\activate on Windows

pip install -r requirements.txt</code></pre>

  <h3>3. Node dependencies</h3>
  <pre><code>npm install</code></pre>

  <h3>4. Run the application (two processes)</h3>
  <pre><code># Terminal 1: start Python backend
python main.py

# Terminal 2: start Node server
npm start</code></pre>
  <p>Then open your browser at <code>http://localhost:3000</code> (default port).</p>

  <h3>🐧 Linux / systemd integration (one‑click start)</h3>
  <p>Use the provided systemd service to run both processes together:</p>
  <pre><code>sudo systemctl start cypher-downloader
sudo systemctl enable cypher-downloader   # autostart on boot</code></pre>
  <p>See <code>start.sh</code> and the unit file in the repository.</p>

  <h2><i class="fas fa-cogs"></i> ⚙️ Architecture</h2>
  <p><strong>Hybrid model:</strong> Python handles downloading, processing, and conversion (yt-dlp, ffmpeg). Node.js (Express) serves the frontend and acts as a bridge, exposing REST endpoints. The frontend communicates with Node via API, which spawns Python subprocesses or uses HTTP calls. Real‑time progress is streamed via WebSockets or polling.</p>

  <h2><i class="fas fa-video"></i> 🎯 Supported Sources & Formats</h2>
  <ul>
    <li><strong>Video:</strong> YouTube, Instagram, Facebook, TikTok (no watermark), direct .mp4/.mkv links.</li>
    <li><strong>Resolutions:</strong> 360p / 480p / 720p / 1080p / 2K / 4K (conditional).</li>
    <li><strong>Audio:</strong> MP3, WAV, FLAC with 120kbps / 320kbps.</li>
    <li><strong>Playlists:</strong> full YouTube playlists with one click.</li>
  </ul>

  <h2><i class="fas fa-brush"></i> 🎨 Theme Customization</h2>
  <p>Switch between four animated themes from the UI. Each theme includes light & dark modes with smooth RGB hover effects. All icons/fonts are pulled from <code>thesvg</code> npm package — no external assets needed.</p>

  <h2><i class="fas fa-bug"></i> 🛡️ Error Handling & Retries</h2>
  <p>Robust error messages, automatic retries on network failure, and smart format merging. The download location defaults to <code>~/Downloads/cypher-downloader</code> and is user‑configurable.</p>

  <h2><i class="fas fa-hands-helping"></i> 🤝 Contributing</h2>
  <p>Pull requests are welcome! For major changes, please open an issue first. Make sure to update tests as appropriate.</p>

  <h2><i class="fas fa-gavel"></i> 📄 License</h2>
  <p>MIT © <strong>Kencypher</strong></p>

  <div class="footer">
    <i class="fas fa-code-branch"></i> Built with Python, Node.js, and pure creativity —<br>
    <i class="fas fa-heart" style="color: #ef4444;"></i> by <strong>Kencypher</strong> · 2026
  </div>
</div>
</body>
</html>
