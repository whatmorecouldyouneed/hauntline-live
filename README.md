# hauntline.live

Mobile-first endless runner web game. Tap to jump. Survive. Highest score wins.

## Status

**MVP live + AR foundation (Feb 20, 2026)**

### What's working

- **Desktop gate**: detects mobile vs desktop. Desktop visitors see "uh oh — hauntline needs a phone" with a QR code for hauntline.live and a "Copy link" button.
- **Home screen**: title "hauntline.live" + Play button + "how to play" (mobile only, tap to jump, survive).
- **Name flow**: "what's your ghost name?" → name input → Mode Select. Player name persisted in localStorage.
- **Mode Select**: Single Player | Single Player (AR) | Create Room | Join Room.
- **Character Select**: full-screen 3D viewer with GLB ghosts (wisp, spark, classic, wraith). Swipe or arrows to cycle. Modern game UI.
- **Three.js endless runner**: GLB character models, scrolling track segments, obstacles with varying heights, fog. Tap to jump. Score HUD.
- **Deterministic engine**: seeded PRNG (Mulberry32) for reproducible obstacle sequences. Fixed-timestep simulation (60Hz). Ready for networked multiplayer.
- **Difficulty ramp**: speed and spawn rate increase over ~90 seconds.
- **Death**: "you died" + score. Retry / Home.
- **Results**: leaderboard sorted by highest score. Rematch / New Match.
- **AR mode**: MindAR image tracking with camera feed. Ghost spawns above detected markers. AR lobby at bottom with ready-up flow, countdown, then game run.
- **Mobile UX**: no text selection, no long-press callout, touch-action manipulation, 48px touch targets, safe-area insets.
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
│   ├── mind-ar.d.ts           # MindAR TypeScript declarations
│   ├── ar.ts                  # AR phases and player slots
│   └── network.ts             # network types
├── hooks/
│   └── useRoom.ts             # room hook (PartyKit-ready)
├── utils/
│   ├── device.ts              # isMobile() detection
│   ├── qr.ts                  # QR code data URL generation
│   └── score.ts               # shared toScore() helper
├── app/screens/
│   ├── DesktopGate.tsx        # mobile gate with QR code
│   ├── Home.tsx               # title + play + how to play
│   ├── NameInput.tsx          # ghost name input
│   ├── ModeSelect.tsx         # single player / AR / create / join room
│   ├── CharacterSelect.tsx     # full-screen 3D picker (swipe + arrows)
│   ├── JoinRoom.tsx           # enter room code
│   ├── GameRun.tsx            # game canvas + score HUD
│   ├── Death.tsx              # death + score + retry/home
│   ├── Results.tsx            # leaderboard
│   ├── ARScreen.tsx           # AR phases (scan → lobby → countdown → play → results)
│   └── ARLobby.tsx            # lobby ready-up UI
├── game/
│   ├── GameCanvas.tsx         # three.js scene, render loop, input
│   ├── CharacterViewer3D.tsx  # 3D character picker (GLB + camera centering)
│   ├── ARExperience.tsx       # AR container + marker scan
│   ├── ARViewer.tsx           # MindARThree + marker tracking
│   ├── ARGameRunner.tsx       # runner in AR space
│   ├── poseSmoother.ts        # AR pose smoothing
│   ├── meshes.ts              # GLB loader, ghost/obstacle factories
│   └── engine/
│       └── RunnerEngine.ts    # deterministic simulation (seeded PRNG, fixed timestep)

public/
├── models/                    # wisp.glb, spark.glb, classic.glb, wraith.glb
├── markers/
│   └── player-one.mind        # compiled MindAR tracking data
└── CNAME                      # hauntline.live

.github/workflows/
└── deploy.yml                 # github actions → github pages
```

### Stack

- Vite 7 + React 19 + TypeScript 5.9
- Three.js 0.183 (vanilla, no R3F)
- MindAR 1.2.5 (image tracking, Vite compat plugin for Three.js deprecations)
- `qrcode` for QR generation
- PartyKit + PartySocket (dev dependency, ready for online rooms)
- GitHub Pages + GitHub Actions for deploy

## TODO (next)

- **P1–P4 markers**: design marker images, compile .mind files, bump to 4 targets
- **AR gameplay**: runner obstacles in AR space anchored to markers
- **Online rooms**: PartyKit WebSocket rooms, shared seed + startTime
- **Sound effects + polish**: tap, death, particles, camera shake

## Dev

```bash
npm install
npm run dev          # vite dev server on :5173
ngrok http 5173     # tunnel for phone testing (HTTPS required for camera)
```

## Deploy

Push to `main` triggers GitHub Actions → builds → deploys to GitHub Pages at hauntline.live.
