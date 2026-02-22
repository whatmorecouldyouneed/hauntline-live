# Deploy and Test Handoff

This document walks you through deploying PartyKit + the static app, configuring environment variables, and testing multiplayer and leaderboard functionality.

---

## Prerequisites

- Node.js 20.19+ or 22.12+ (for Vite)
- GitHub account (for PartyKit auth and Pages deploy)
- Two mobile devices or one device + desktop browser (for multiplayer testing)

---

## Part 1: Deploy PartyKit

PartyKit hosts the multiplayer server and leaderboard. No separate signup — you log in with GitHub on first deploy.

### 1.1 Deploy

```bash
cd /Users/jvredmoore/WMCYN/hauntline-live
npx partykit deploy
```

- On first run, a browser window opens for GitHub login.
- Grant PartyKit the requested permissions.
- After deploy, you’ll get a URL like:  
  `https://hauntline-live.<your-github-username>.partykit.dev`
- DNS can take up to ~2 minutes.

### 1.2 Note Your PartyKit Host

Use the host part only (no `https://`):

```
hauntline-live.<your-github-username>.partykit.dev
```

---

## Part 2: Configure Production Environment

### 2.1 Create or Update `.env.production`

In the project root, create or edit `.env.production`:

```
VITE_PARTYKIT_HOST=hauntline-live.<your-github-username>.partykit.dev
```

Replace `<your-github-username>` with your actual GitHub username from the PartyKit URL.

### 2.2 Ensure `.env.production` Is Not Committed

`.env.production` typically contains deployment-specific values. If you use a static host (e.g. GitHub Pages), you often set `VITE_PARTYKIT_HOST` in the build environment instead of committing it.

**Option A — Build with env file**

```bash
VITE_PARTYKIT_HOST=hauntline-live.xyz.partykit.dev npm run build
```

**Option B — GitHub Actions (recommended, already configured)**

1. In the repo: Settings → Secrets and variables → Actions.
2. Add repository secret:  
   - Name: `VITE_PARTYKIT_HOST`  
   - Value: `hauntline-live.<username>.partykit.dev`
3. The workflow already passes this into the build step.

---

## Part 3: Deploy Static App (GitHub Pages)

### 3.1 Current Setup

GitHub Actions deploys on push to `main`:

- Builds Vite → `dist/`
- Deploys to GitHub Pages

### 3.2 If Using Custom Domain

If `CNAME` points to `hauntline.live`, ensure the Pages branch and path match your workflow.

### 3.3 Build Before Deploy

```bash
npm run build
```

Verify `dist/` contains `index.html` and JS/CSS assets.

---

## Part 4: GitHub Actions

The workflow passes `VITE_PARTYKIT_HOST` from the `VITE_PARTYKIT_HOST` repo secret into the build. Add that secret before pushing (see Part 2.2 Option B).

To also deploy PartyKit from CI, add a step that runs `npx partykit deploy` after `npm run build`. PartyKit deploy typically uses `PARTYKIT_TOKEN` or GitHub OAuth from the runner.

---

## Part 5: Testing Checklist

### 5.1 Local Development

**Terminal 1 — PartyKit**

```bash
npm run dev:party
```

- Server: `http://localhost:1999`
- `.env.development` uses `VITE_PARTYKIT_HOST=localhost:1999`

**Terminal 2 — Vite**

```bash
npm run dev
```

- App: `http://localhost:5173`
- On desktop you hit the “mobile only” gate (QR code). For local testing:
  - Use a phone on the same network, or
  - Use ngrok: `ngrok http 5173` and open the HTTPS URL on your phone (MindAR needs HTTPS for camera).

### 5.2 Leaderboard

1. Start app (local or deployed).
2. Enter name → Mode Select → Single Player (AR) or Single Player (non-AR).
3. Play until death.
4. After death, score should auto-submit.
5. Go to Home → Leaderboard (or Leaderboard from Death screen).
6. Your score should appear in the global leaderboard.

**Verify leaderboard API**

```bash
curl https://hauntline-live.<username>.partykit.dev/parties/leaderboard/global
```

Expect JSON array of `{ name, score }`.

### 5.3 Multiplayer (AR)

Needs two devices with AR markers (P1–P4 from `targets.mind`).

**Device A (host)**

1. Create Room → note 4-letter code (e.g. `ABCD`).
2. Point camera at a marker until it’s detected.
3. Tap Ready. Wait for Device B.

**Device B (guest)**

1. Join Room → enter same code `ABCD`.
2. Point at a different marker.
3. Tap Ready.

**Both devices**

- Countdown runs together (synced via PartyKit).
- Game starts at the same time.
- Tap to jump; jumps broadcast to other clients.
- When all die, Results show both scores.
- Rematch returns both to lobby with reset state.

### 5.4 Profanity Filter

1. Name Input screen.
2. Enter a blocked word (e.g. common profanity).
3. Tap Next → expect error: “Please choose a different name”.

### 5.5 Single-Player AR (No Multiplayer)

1. Mode Select → Single Player (AR).
2. Point at a marker → Ready → Play.
3. No room code; no PartyKit connection.
4. Works offline (except leaderboard submit at end).

---

## Part 6: Debugging

### PartyKit logs

```bash
npx partykit tail
```

Shows live requests and errors for your deployed PartyKit app.

### Browser console

- Network tab for `partykit.dev` and leaderboard requests.
- Check WebSocket connections to PartyKit for multiplayer.

### Common issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Leaderboard empty after death | Wrong `VITE_PARTYKIT_HOST` or CORS | Verify env and leaderboard CORS headers |
| Multiplayer not syncing | Wrong host or room code | Ensure both use same PartyKit host and code |
| “mobile only” on desktop | By design | Use phone or emulate mobile |
| Camera not working | HTTP (no HTTPS) | Use ngrok or HTTPS host for local testing |

---

## Part 7: Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run dev:party` | PartyKit dev server |
| `npm run build` | Production build |
| `npx partykit deploy` | Deploy PartyKit |
| `npx partykit tail` | Live PartyKit logs |

| Env var | Dev | Prod |
|---------|-----|------|
| `VITE_PARTYKIT_HOST` | `localhost:1999` | `hauntline-live.<username>.partykit.dev` |
