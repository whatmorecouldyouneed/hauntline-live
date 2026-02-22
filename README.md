# hauntline.live

Mobile-first endless runner web game. Tap to jump. Survive. Highest score wins.

## Status

**MVP + AR + multiplayer (Feb 2026)**

### What's working

- **Desktop gate**: detects mobile vs desktop. Desktop visitors see "uh oh — hauntline needs a phone" with a QR code and "Copy link" button.
- **Home → Name → Mode Select**: ghost name input, persisted in localStorage.
- **Mode Select**: Single Player | Single Player (AR) | Create Room | Join Room.
- **Character Select**: full-screen 3D viewer with GLB ghosts (wisp, spark, classic, wraith). Swipe or arrows to cycle.
- **Three.js endless runner**: scrolling track, obstacles, fog. Tap to jump. Score HUD. Deterministic seeded engine.
- **Death + Results**: score, retry, leaderboard (PartyKit backend).
- **AR mode**: MindAR image tracking. P1–P4 markers. AR lobby with ready-up, countdown, then game. Intro animation, spectate when dead.
- **Multiplayer**: PartyKit WebSocket rooms. Create/join by code. Synced start, jumps, deaths. Game continues for survivors when one player dies.
- **Audio**: procedural tap/death SFX, background music, global mute toggle.
- **Mobile UX**: touch-optimized, safe-area insets, Eruda dev tools for mobile debugging.
- **Deploy**: GitHub Actions → GitHub Pages. CNAME for hauntline.live.

### File structure

```
src/
├── App.tsx
├── App.css
├── main.tsx                 # eruda init (deferred), preload
├── context/
│   └── AudioContext.tsx     # BGM + mute
├── types/
│   ├── game.ts
│   ├── ar.ts
│   ├── network.ts           # ClientMsg, ServerMsg, RoomState
│   └── mind-ar.d.ts
├── hooks/
│   └── useRoom.ts           # PartySocket, roomState, send
├── utils/
│   ├── device.ts
│   ├── qr.ts
│   ├── score.ts
│   ├── audio.ts             # playTap, playDeath, startBgm
│   └── leaderboard.ts       # PartyKit leaderboard API
├── app/screens/
│   ├── DesktopGate.tsx
│   ├── Home.tsx
│   ├── NameInput.tsx
│   ├── ModeSelect.tsx
│   ├── CharacterSelect.tsx
│   ├── JoinRoom.tsx
│   ├── GameRun.tsx
│   ├── Death.tsx
│   ├── Results.tsx
│   ├── Leaderboard.tsx
│   ├── ARHowToPlay.tsx      # camera check, marker downloads
│   ├── ARScreen.tsx         # AR phases, useRoom, loading
│   └── ARLobby.tsx
├── game/
│   ├── GameCanvas.tsx
│   ├── ARExperience.tsx     # MindAR + runner in AR
│   ├── ARViewer.tsx
│   ├── ARGameRunner.tsx
│   ├── CharacterViewer3D.tsx
│   ├── characterSelectAssets.ts
│   ├── introAnim.ts
│   ├── meshes.ts
│   ├── engine/
│   │   └── RunnerEngine.ts
│   └── poseSmoother.ts

party/
├── index.ts                 # HauntlineServer (join, ready, jump, death, rematch)
└── leaderboard.ts

public/
├── models/                  # wisp.glb, spark.glb, classic.glb, wraith.glb
├── markers/
│   └── targets.mind         # P1–P4 compiled MindAR data
├── hyper-pop-beat.mp3
└── CNAME
```

### Stack

- Vite 7 + React 19 + TypeScript 5.9
- Three.js 0.183
- MindAR 1.2.5
- PartyKit + PartySocket (multiplayer + leaderboard)
- Eruda (mobile dev tools)
- GitHub Pages + GitHub Actions

## Dev

```bash
npm install
npm run dev          # Vite on :5173
npm run dev:party    # PartyKit on :1999 (for multiplayer)
```

For AR testing: use ngrok or similar to expose localhost over HTTPS (camera requires secure context).

## Deploy

Push to `main` triggers build + deploy to GitHub Pages. Set `VITE_PARTYKIT_HOST` in repo secrets for multiplayer/leaderboard in production. Deploy PartyKit separately with `npm run deploy:party`.
