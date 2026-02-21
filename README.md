# hauntline.live

Mobile-first endless runner web game. Tap to jump. Survive. Highest score wins.

## Status

**MVP — ship-ready (Feb 20, 2026)**

### What's done

- **Desktop gate**: detects mobile vs desktop. Desktop visitors see a full-screen black overlay with "uh oh — hauntline needs a phone", a QR code linking to hauntline.live, and a "Copy link" button.
- **Home screen**: title "hauntline.live" + Play button + "how to play" instructions (mobile only, tap to jump, survive as long as possible).
- **Ghost name input**: "what's your ghost name?" with player count selector (1–4) and name inputs.
- **Pass-the-phone multiplayer**: supports 1–4 players taking turns. Death screen shows "pass the phone to {next}" between turns.
- **Turn intro screen**: "{Name} — you're up" + "tap to jump. survive." + Start button.
- **Three.js endless runner**: glowing green ghost sphere, centered obstacles with varying heights, ground plane, fog. Tap anywhere to jump. Score HUD counts up live (10 pts/sec).
- **Difficulty ramp**: speed increases and spawn interval decreases over 45 seconds.
- **Death screen**: red "you died" + final score + pass-the-phone handoff. Buttons: Retry, Next Player / See Results.
- **Results screen**: leaderboard sorted by highest score. Buttons: Rematch, New Match.
- **Mobile UX**: no text selection, no long-press callout, touch-action manipulation on game canvas, 48px touch targets.
- **Deploy pipeline**: GitHub Actions workflow builds and deploys to GitHub Pages on push to main. CNAME configured for hauntline.live.

### File structure

```
src/
├── App.tsx                  # top-level state machine
├── App.css                  # screen layouts and component styles
├── index.css                # global resets, typography, button base
├── main.tsx                 # react root
├── app/screens/
│   ├── DesktopGate.tsx      # mobile gate with QR code
│   ├── Home.tsx             # title + play + how to play
│   ├── PlayersSetup.tsx     # ghost name + player count (1–4)
│   ├── TurnIntro.tsx        # per-player intro
│   ├── GameRun.tsx          # game canvas + score HUD
│   ├── Death.tsx            # death + score + handoff
│   └── Results.tsx          # leaderboard
├── game/
│   ├── GameCanvas.tsx       # three.js scene, render loop, input
│   └── engine/
│       └── RunnerEngine.ts  # pure simulation (no three.js dep)
└── utils/
    ├── device.ts            # isMobile() detection
    └── qr.ts                # QR code data URL generation

.github/workflows/
└── deploy.yml               # github actions → github pages

public/
└── CNAME                    # custom domain for github pages
```

### Stack

- Vite 7 + React 19 + TypeScript 5.9
- Three.js (vanilla, no R3F)
- `qrcode` package for QR generation
- GitHub Pages + GitHub Actions for deploy

## TODO (future)

- **MindAR markers**: unique printed markers P1–P4 for scan-to-spawn
- **Online rooms**: deterministic seed + startTime for networked play
- **GLB assets**: replace sphere/box with Meshy-generated 3D models
- **Sound effects**: tap, death, score milestones
- **Scene polish**: camera shake on death, particle effects, final lighting pass

## Dev

```bash
npm install
npm run dev          # starts vite dev server on :5173
ngrok http 5173      # tunnel for phone testing
```

## Deploy

Push to `main` triggers GitHub Actions → builds → deploys to GitHub Pages at hauntline.live.

```bash
git add -A
git commit -m "your message"
git push origin main
```
