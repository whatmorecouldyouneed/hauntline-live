# hauntline.live

Mobile-first endless runner web game. Tap to jump. Survive. Highest score wins.

## Status

**MVP live + AR foundation (Feb 20, 2026)**

### What's working

- **Desktop gate**: detects mobile vs desktop. Desktop visitors see "uh oh — hauntline needs a phone" with a QR code for hauntline.live and a "Copy link" button.
- **Home screen**: title "hauntline.live" + Play button + AR Mode button + "how to play" instructions.
- **Ghost name input**: "what's your ghost name?" with player count selector (1–4) and name inputs.
- **Pass-the-phone multiplayer**: 1–4 players taking turns. Death screen shows "pass the phone to {next}".
- **Three.js endless runner**: glowing ghost sphere, centered obstacles with varying heights, ground plane, fog. Tap to jump. Score HUD (10 pts/sec).
- **Deterministic engine**: seeded PRNG (Mulberry32) for reproducible obstacle sequences. Fixed-timestep simulation (60Hz) for frame-rate-independent determinism. Ready for networked multiplayer.
- **Difficulty ramp**: speed and spawn rate increase over 45 seconds.
- **Death + Results**: red "you died" + score. Leaderboard sorted by highest score. Rematch / New Match.
- **AR mode**: MindAR image tracking with camera feed. Ghost sphere spawns above detected markers. Multi-marker architecture scaffolded (4 player slots with per-player colors). Marker status HUD.
- **Mobile UX**: no text selection, no long-press callout, touch-action manipulation, 48px touch targets.
- **Deploy**: GitHub Actions builds and deploys to GitHub Pages on push to main. CNAME for hauntline.live.

### File structure

```
src/
├── App.tsx                    # top-level state machine
├── App.css                    # screen layouts and component styles
├── index.css                  # global resets, typography, button base
├── main.tsx                   # react root
├── types/
│   ├── game.ts                # shared Player interface
│   └── mind-ar.d.ts           # MindAR TypeScript declarations
├── utils/
│   ├── device.ts              # isMobile() detection
│   ├── qr.ts                  # QR code data URL generation
│   └── score.ts               # shared toScore() helper
├── app/screens/
│   ├── DesktopGate.tsx        # mobile gate with QR code
│   ├── Home.tsx               # title + play + AR mode + how to play
│   ├── PlayersSetup.tsx       # ghost name + player count (1–4)
│   ├── TurnIntro.tsx          # per-player intro
│   ├── GameRun.tsx            # game canvas + score HUD
│   ├── Death.tsx              # death + score + handoff
│   ├── Results.tsx            # leaderboard
│   └── ARScreen.tsx           # AR camera + marker HUD
├── game/
│   ├── GameCanvas.tsx         # three.js scene, render loop, input
│   ├── ARViewer.tsx           # MindARThree + marker tracking
│   ├── meshes.ts              # shared ghost/obstacle mesh factories
│   └── engine/
│       └── RunnerEngine.ts    # deterministic simulation (seeded PRNG, fixed timestep)

public/markers/
└── targets.mind               # compiled MindAR tracking data (test card, swap for P1-P4)

.github/workflows/
└── deploy.yml                 # github actions → github pages
```

### Stack

- Vite 7 + React 19 + TypeScript 5.9
- Three.js 0.183 (vanilla, no R3F)
- MindAR 1.2.5 (image tracking, Vite compat plugin for Three.js deprecations)
- `qrcode` for QR generation
- GitHub Pages + GitHub Actions for deploy

## TODO (next)

- **P1-P4 markers**: design marker images, compile .mind file, bump NUM_TARGETS to 4
- **AR lobby**: ready-up flow per detected marker
- **AR gameplay**: runner obstacles in AR space anchored to markers
- **Online rooms**: PartyKit WebSocket rooms, shared seed + startTime
- **GLB assets**: Meshy models replacing sphere/box
- **Sound effects + polish**: tap, death, particles, camera shake

## Dev

```bash
npm install
npm run dev          # vite dev server on :5173
ngrok http 5173      # tunnel for phone testing (HTTPS required for camera)
```

## Deploy

Push to `main` triggers GitHub Actions → builds → deploys to GitHub Pages at hauntline.live.
