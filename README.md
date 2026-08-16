# 🦄 CHROMA: The Last Unicorn

> An atmospheric WebXR & Desktop 3D experience built for **JS13K Games**.
> Rediscover childhood wonder through procedural rainbows, interactive memories, and a luminous unicorn companion.

---

## 🎮 Controls & Configuration

### 🖥️ Desktop PC Controls
| Action | Key / Input |
|---|---|
| **Movement** | `W`, `A`, `S`, `D` or `Arrow Keys` |
| **Look Around** | `Mouse` (PointerLock captures on click, drag also supported) |
| **Interact / Awaken** | `Left Click` or `E` or `Enter` |
| **Ascend / Float Up** | `Spacebar` |
| **Descend / Crouch** | `Left Shift` or `C` |
| **Toggle Live Dev Studio** | `~` (Backquote) or `F2` or click top-right **⚙️ Studio** pill |

---

### 🛠️ PC Live Dev Studio & Tuning Panel
Press `~` or `F2` during development (`npm run dev`) to open the in-browser **Dreamcrafter Studio**:
- **Story Act Jump**: Instantly jump between Act 0 (Slide), Act 1 (Adulthood Grey), Act 2 (Shards Hunting), and Act 3 (Unicorn Awakening).
- **🌾 Grass & Meadow Tuner**: Real-time sliders for Grass Density (1,000 – 28,000 blades), Blade Width, Blade Height, Wind Sway Speed, and Gust Strength.
- **🎨 Shader & Atmosphere Tuner**: Live adjustments for Sky Blend Intensity, Particle Glitter / Sparkles, Iridescence, and Awakening Progress ratio.
- **📋 Export Config**: One-click JSON copy of your custom tuned parameters to the clipboard.

---

### 🥽 WebXR (VR Headset) Controls
| Action | VR Controller Input |
|---|---|
| **Smooth Locomotion** | `Left Thumbstick` (Forward / Backward / Strafe) |
| **Snap Turning & Flying** | `Right Thumbstick` (Turn left/right, Up/Down to fly) |
| **Laser Interact & Shard Punch** | `Trigger` (Aim laser or punch shards directly in 3D space) |

---

## ✨ Features

- **🎮 Dual-Mode Playability**: Full WebXR immersive VR headset support (Meta Quest, Pico, Apple Vision Pro) and smooth first-person PC keyboard + mouse controls.
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
npm run push -- "Update PC config & controls guide"
```

---

## 🌐 Deploy to Netlify

This repository is pre-configured with `netlify.toml` and includes the pre-built `dist/` directory:
- **Publish directory**: `dist`
- **Build command**: `npm run build`

Simply connect this repository to [Netlify](https://www.netlify.com/) for instant automated deployments on every `git push`.
