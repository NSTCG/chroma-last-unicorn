# 🦄 CHROMA: The Last Unicorn

> An atmospheric WebXR & Desktop 3D experience built for **JS13K Games**.
> Rediscover childhood wonder through procedural rainbows, interactive memories, and a luminous unicorn companion.

---

## ✨ Features

- **🎮 Dual-Mode Playability**: Full WebXR immersive VR headset support (Meta Quest, Pico, Apple Vision Pro via WebXR) and smooth first-person PC keyboard + mouse controls.
- **🌈 Custom Procedural Shaders**: Dynamic aurora-like rainbow skies, procedural particle systems, and responsive grass fields.
- **📖 Narrative Journey**: Interactive emotional storytelling shards with integrated VR spatial HUD and custom audio synthesis.
- **⚡ Ultra Compact & Fast**: Single-file bundled distribution (`dist/index.html`) optimized for zero-dependency instant loading on Netlify, GitHub Pages, or any static host.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Local Development
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build
```bash
npm run build
```
Builds the standalone single-file distribution into `dist/index.html`.

### JS13k Compression & Size Inspection
```bash
npm run build:zip
```

---

## 🚀 One-Command Deployment & Git Push

To automatically build the latest bundle and push changes to GitHub (triggering Netlify / static deployment):

```bash
# Push with default timestamp message
npm run push

# Push with custom commit message
npm run push -- "Update unicorn shader and lighting"
```

---

## 🌐 Deploy to Netlify

This repository is pre-configured with `netlify.toml` and includes the pre-built `dist/` directory:
- **Publish directory**: `dist`
- **Build command**: `npm run build`

Simply connect this repository to [Netlify](https://www.netlify.com/) for instant automated deployments on every `git push`.
